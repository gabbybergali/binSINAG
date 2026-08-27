package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/binsinag/telemetry-processor/pkg/decoder"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// ChirpStackUplink represents the JSON payload forwarded by ChirpStack webhook
type ChirpStackUplink struct {
	DeviceInfo struct {
		DeviceName string `json:"deviceName"`
		DevEUI     string `json:"devEui"`
	} `json:"deviceInfo"`
	FCnt int    `json:"fCnt"`
	FPort int   `json:"fPort"`
	Data string `json:"data"` // Base64 encoded binary payload
}

type Server struct {
	db    *pgxpool.Pool
	redis *redis.Client
}

func main() {
	log.Println("Starting BinSINAG Telemetry Ingestion Service...")

	// 1. Establish Database Pool Connection
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:securepassword123@localhost:5432/binsinag?sslmode=disable"
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	dbPool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbPool.Close()

	// Verify DB Connection
	if err := dbPool.Ping(ctx); err != nil {
		log.Fatalf("Database ping failed: %v\n", err)
	}
	log.Println("Successfully connected to PostgreSQL/PostGIS database")

	// 2. Establish Redis Connection
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}
	rdb := redis.NewClient(&redis.Options{
		Addr: redisURL,
	})
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Printf("Warning: Redis ping failed: %v. Live updates will be disabled.\n", err)
	} else {
		log.Println("Successfully connected to Redis")
	}
	defer rdb.Close()

	srv := &Server{
		db:    dbPool,
		redis: rdb,
	}

	// 3. Define HTTP Handlers
	mux := http.NewServeMux()
	mux.HandleFunc("/health", srv.handleHealth)
	mux.HandleFunc("/api/v1/telemetry/uplink", srv.handleUplink)

	server := &http.Server{
		Addr:         ":8080",
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	// Graceful shutdown setup
	go func() {
		log.Println("Ingestion service listening on :8080")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("ListenAndServe error: %v\n", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	log.Println("Shutting down telemetry server gracefully...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	log.Println("Telemetry server stopped")
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"healthy"}`))
}

func (s *Server) handleUplink(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var uplink ChirpStackUplink
	if err := json.NewDecoder(r.Body).Decode(&uplink); err != nil {
		log.Printf("Error decoding JSON request body: %v\n", err)
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	if uplink.Data == "" {
		log.Println("Error: Telemetry payload data field is empty")
		http.Error(w, "Unprocessable Entity", http.StatusUnprocessableEntity)
		return
	}

	// 1. Decode base64 string to raw bytes
	binaryData, err := base64.StdEncoding.DecodeString(uplink.Data)
	if err != nil {
		log.Printf("Error decoding base64 payload data: %v\n", err)
		http.Error(w, "Invalid Base64 Data", http.StatusBadRequest)
		return
	}

	// 2. Decode bytes into struct metrics
	report, err := decoder.DecodePayload(binaryData)
	if err != nil {
		log.Printf("Error parsing 12-byte telemetry: %v\n", err)
		http.Error(w, fmt.Sprintf("Parser Error: %v", err), http.StatusBadRequest)
		return
	}

	// 3. Process telemetry update in database
	ctx := r.Context()
	err = s.processTelemetry(ctx, uplink.DeviceInfo.DeviceName, report, binaryData)
	if err != nil {
		log.Printf("Database sync error for device %s: %v\n", uplink.DeviceInfo.DeviceName, err)
		http.Error(w, "Database Sync Failed", http.StatusInternalServerError)
		return
	}

	log.Printf("Telemetry processed for Bin: %s | Fill: %.2f%% | Weight: %.2fkg | Battery: %.2f%%\n",
		uplink.DeviceInfo.DeviceName, report.FillLevel, report.WeightKg, report.BatteryLevel)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"success"}`))
}

func (s *Server) processTelemetry(ctx context.Context, binCode string, report *decoder.TelemetryReport, raw []byte) error {
	// Start a transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Determine status string
	status := "Normal"
	if report.FillLevel >= 80.0 {
		status = "Overflowing"
	}
	if report.SensorFault {
		status = "Maintenance"
	}

	// 1. Check if bin exists. If not, auto-register it at a default coordinate (0, 0)
	var binID string
	err = tx.QueryRow(ctx, "SELECT id FROM bins WHERE bin_code = $1", binCode).Scan(&binID)
	if err != nil {
		// Auto-create bin if not present
		err = tx.QueryRow(ctx, `
			INSERT INTO bins (bin_code, location, fill_level, weight_kg, battery_level, status, last_telemetry_at)
			VALUES ($1, ST_SetSRID(ST_Point(120.9842, 14.5995), 4326), $2, $3, $4, $5, NOW())
			RETURNING id
		`, binCode, report.FillLevel, report.WeightKg, report.BatteryLevel, status).Scan(&binID)
		if err != nil {
			return fmt.Errorf("failed to register new bin: %w", err)
		}
		log.Printf("Registered new smart bin in database: %s", binCode)
	} else {
		// Update existing bin
		_, err = tx.Exec(ctx, `
			UPDATE bins 
			SET fill_level = $1, weight_kg = $2, battery_level = $3, status = $4, last_telemetry_at = NOW(), updated_at = NOW()
			WHERE id = $5
		`, report.FillLevel, report.WeightKg, report.BatteryLevel, status, binID)
		if err != nil {
			return fmt.Errorf("failed to update bin telemetry: %w", err)
		}
	}

	// 2. Insert metrics log
	_, err = tx.Exec(ctx, `
		INSERT INTO telemetry_logs (bin_id, fill_level, weight_kg, battery_level, organic_count, non_organic_count, recyclable_count, raw_payload, logged_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
	`, binID, report.FillLevel, report.WeightKg, report.BatteryLevel, report.OrganicCount, report.NonOrganicCount, report.RecyclableCount, raw)
	if err != nil {
		return fmt.Errorf("failed to log telemetry history: %w", err)
	}

	// Commit Transaction
	if err := tx.Commit(ctx); err != nil {
		return err
	}

	// 3. Publish update event to Redis Pub/Sub for NestJS WebSockets server
	if s.redis != nil {
		eventData := map[string]interface{}{
			"bin_id":        binID,
			"bin_code":      binCode,
			"fill_level":    report.FillLevel,
			"weight_kg":     report.WeightKg,
			"battery_level": report.BatteryLevel,
			"status":        status,
			"timestamp":     time.Now().Format(time.RFC3339),
			"diagnostics": map[string]bool{
				"tamper_alert": report.TamperAlert,
				"sensor_fault": report.SensorFault,
			},
		}
		payloadJSON, _ := json.Marshal(eventData)
		s.redis.Publish(ctx, "bin:telemetry", payloadJSON)

		// If fill level breaches 80%, publish a separate urgent alarm
		if report.FillLevel >= 80.0 {
			s.redis.Publish(ctx, "bin:overflow", payloadJSON)
		}
	}

	return nil
}
