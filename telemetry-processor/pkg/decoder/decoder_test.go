package decoder

import (
	"testing"
)

func TestDecodePayload_Success(t *testing.T) {
	// Let's build a mock binary payload:
	// Fill level: 85.50% -> 8550 -> 0x2166 (Big Endian: [0x21, 0x66])
	// Weight: 12.345 kg -> 12345g -> 0x3039 (Big Endian: [0x30, 0x39])
	// Battery: 92% -> 92 -> 0x5C
	// Organic: 12 -> 0x000C (Big Endian: [0x00, 0x0C])
	// Non-organic: 45 -> 0x002D (Big Endian: [0x00, 0x2D])
	// Recyclable: 110 -> 0x006E (Big Endian: [0x00, 0x6E])
	// Status Flags: 0x01 (Tamper Alert true, Sensor Fault false)
	payload := []byte{
		0x21, 0x66, // Fill
		0x30, 0x39, // Weight
		0x5C,       // Battery
		0x00, 0x0C, // Organic
		0x00, 0x2D, // Non-Organic
		0x00, 0x6E, // Recyclable
		0x01,       // Flags
	}

	report, err := DecodePayload(payload)
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if report.FillLevel != 85.50 {
		t.Errorf("Expected FillLevel 85.50, got %.2f", report.FillLevel)
	}
	if report.WeightKg != 12.345 {
		t.Errorf("Expected WeightKg 12.345, got %.3f", report.WeightKg)
	}
	if report.BatteryLevel != 92.0 {
		t.Errorf("Expected BatteryLevel 92.0, got %.1f", report.BatteryLevel)
	}
	if report.OrganicCount != 12 {
		t.Errorf("Expected OrganicCount 12, got %d", report.OrganicCount)
	}
	if report.NonOrganicCount != 45 {
		t.Errorf("Expected NonOrganicCount 45, got %d", report.NonOrganicCount)
	}
	if report.RecyclableCount != 110 {
		t.Errorf("Expected RecyclableCount 110, got %d", report.RecyclableCount)
	}
	if !report.TamperAlert {
		t.Errorf("Expected TamperAlert true, got false")
	}
	if report.SensorFault {
		t.Errorf("Expected SensorFault false, got true")
	}
}

func TestDecodePayload_InvalidLength(t *testing.T) {
	shortPayload := []byte{0x00, 0x01, 0x02}
	_, err := DecodePayload(shortPayload)
	if err == nil {
		t.Error("Expected error for short payload length, got nil")
	}
}

func TestDecodePayload_OutOfBoundsFillLevel(t *testing.T) {
	// Fill level: 105.00% -> 10500 -> 0x2904 (Big Endian: [0x29, 0x04])
	payload := []byte{
		0x29, 0x04,
		0x00, 0x00,
		0x64,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		0x00,
	}
	_, err := DecodePayload(payload)
	if err == nil {
		t.Error("Expected error for out-of-bounds fill level, got nil")
	}
}

func TestDecodePayload_OutOfBoundsBattery(t *testing.T) {
	// Battery level: 120% -> 120 -> 0x78
	payload := []byte{
		0x13, 0x88, // 50.00%
		0x00, 0x00,
		0x78, // 120
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		0x00,
	}
	_, err := DecodePayload(payload)
	if err == nil {
		t.Error("Expected error for out-of-bounds battery level, got nil")
	}
}
