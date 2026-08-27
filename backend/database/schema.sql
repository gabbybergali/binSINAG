-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Driver', 'Citizen')),
    phone_number VARCHAR(20),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. CITIZEN PROFILES TABLE (Extends users for gamification)
CREATE TABLE IF NOT EXISTS citizen_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    qr_code_identifier VARCHAR(100) UNIQUE NOT NULL,
    points_balance INT DEFAULT 0 CHECK (points_balance >= 0),
    address TEXT,
    barangay VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. BINS TABLE (Smart Bins telemetry status & coordinates)
CREATE TABLE IF NOT EXISTS bins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bin_code VARCHAR(50) UNIQUE NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL, -- Point coordinates (Latitude, Longitude)
    fill_level NUMERIC(5, 2) DEFAULT 0.00 CHECK (fill_level BETWEEN 0.00 AND 100.00),
    weight_kg NUMERIC(8, 2) DEFAULT 0.00 CHECK (weight_kg >= 0.00),
    battery_level NUMERIC(5, 2) DEFAULT 100.00 CHECK (battery_level BETWEEN 0.00 AND 100.00),
    status VARCHAR(20) DEFAULT 'Normal' CHECK (status IN ('Normal', 'Overflowing', 'Maintenance', 'Inactive')),
    last_telemetry_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TELEMETRY LOGS TABLE (Time-series log of all sensor check-ins)
CREATE TABLE IF NOT EXISTS telemetry_logs (
    id BIGSERIAL PRIMARY KEY,
    bin_id UUID NOT NULL REFERENCES bins(id) ON DELETE CASCADE,
    fill_level NUMERIC(5, 2) NOT NULL,
    weight_kg NUMERIC(8, 2) NOT NULL,
    battery_level NUMERIC(5, 2) NOT NULL,
    organic_count INT DEFAULT 0,
    non_organic_count INT DEFAULT 0,
    recyclable_count INT DEFAULT 0,
    raw_payload JSONB,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. COLLECTIONS TABLE (Track waste pickup transactions by drivers)
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bin_id UUID NOT NULL REFERENCES bins(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verification_method VARCHAR(20) NOT NULL CHECK (verification_method IN ('QR_SCAN', 'MANUAL_TAP')),
    weight_collected_kg NUMERIC(8, 2) CHECK (weight_collected_kg >= 0.00),
    fill_level_before NUMERIC(5, 2) NOT NULL
);

-- 6. REWARDS CATALOG TABLE
CREATE TABLE IF NOT EXISTS rewards_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    points_cost INT NOT NULL CHECK (points_cost > 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. REWARDS AND TRANSACTIONS TABLE (Audit trail for points)
CREATE TABLE IF NOT EXISTS rewards_and_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    citizen_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(25) NOT NULL CHECK (transaction_type IN ('EARNED_DISPOSAL', 'REDEEMED_REWARD')),
    points INT NOT NULL, -- Positive for earned, negative for redeemed
    details JSONB, -- Stores metadata like {'bin_id': '...', 'reward_id': '...'}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DATABASE INDEXES FOR GIS & QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_bins_location ON bins USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_telemetry_bin_logged ON telemetry_logs (bin_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_collections_bin ON collections (bin_id);
CREATE INDEX IF NOT EXISTS idx_transactions_citizen ON rewards_and_transactions (citizen_id);
