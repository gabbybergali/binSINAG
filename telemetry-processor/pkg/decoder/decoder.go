package decoder

import (
	"encoding/binary"
	"fmt"
)

// TelemetryReport represents the decoded and scaled sensor values
type TelemetryReport struct {
	FillLevel     float64 `json:"fill_level"`      // 0.00% to 100.00%
	WeightKg      float64 `json:"weight_kg"`       // Weight in kilograms
	BatteryLevel  float64 `json:"battery_level"`   // 0.00% to 100.00%
	OrganicCount  int     `json:"organic_count"`   // Count of organic items disposed
	NonOrganicCount int   `json:"non_organic_count"` // Count of non-organic items
	RecyclableCount int   `json:"recyclable_count"` // Count of recyclable items
	TamperAlert   bool    `json:"tamper_alert"`    // High-priority physical tamper flag
	SensorFault   bool    `json:"sensor_fault"`    // Diagnostic flag for hardware issues
}

// DecodePayload parses a 12-byte binary slice into a TelemetryReport.
// The byte layout is:
// - Bytes 0-1: Fill Level (0 to 10000 mapping to 0.00% - 100.00%) [uint16, Big-Endian]
// - Bytes 2-3: Weight in grams (0 to 65535) [uint16, Big-Endian]
// - Byte 4: Battery level (0 to 100) [uint8]
// - Bytes 5-6: Organic waste objects count [uint16, Big-Endian]
// - Bytes 7-8: Non-organic waste objects count [uint16, Big-Endian]
// - Bytes 9-10: Recyclable waste objects count [uint16, Big-Endian]
// - Byte 11: Diagnostic / Status flags [uint8] (Bit 0: Tamper, Bit 1: Fault)
func DecodePayload(payload []byte) (*TelemetryReport, error) {
	if len(payload) != 12 {
		return nil, fmt.Errorf("invalid payload length: expected 12 bytes, got %d", len(payload))
	}

	fillRaw := binary.BigEndian.Uint16(payload[0:2])
	weightRaw := binary.BigEndian.Uint16(payload[2:4])
	batteryRaw := payload[4]
	organicRaw := binary.BigEndian.Uint16(payload[5:7])
	nonOrganicRaw := binary.BigEndian.Uint16(payload[7:9])
	recyclableRaw := binary.BigEndian.Uint16(payload[9:11])
	statusFlags := payload[11]

	report := &TelemetryReport{
		FillLevel:       float64(fillRaw) / 100.0,
		WeightKg:        float64(weightRaw) / 1000.0,
		BatteryLevel:    float64(batteryRaw),
		OrganicCount:    int(organicRaw),
		NonOrganicCount: int(nonOrganicRaw),
		RecyclableCount: int(recyclableRaw),
		TamperAlert:     (statusFlags & 0x01) > 0,
		SensorFault:     (statusFlags & 0x02) > 0,
	}

	// Boundary validations
	if report.FillLevel < 0 || report.FillLevel > 100.0 {
		return nil, fmt.Errorf("decoded fill level out of bounds: %.2f%%", report.FillLevel)
	}
	if report.BatteryLevel < 0 || report.BatteryLevel > 100.0 {
		return nil, fmt.Errorf("decoded battery level out of bounds: %.2f%%", report.BatteryLevel)
	}

	return report, nil
}
