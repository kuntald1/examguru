-- Phase 5+6 Migration — Run once on production DB
CREATE TABLE IF NOT EXISTS teachers (
    id SERIAL PRIMARY KEY, institute_id INTEGER NOT NULL,
    name VARCHAR(200) NOT NULL, email VARCHAR(200) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, subject VARCHAR(100) DEFAULT '',
    phone VARCHAR(20) DEFAULT '', active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS call_rooms (
    id SERIAL PRIMARY KEY, institute_id INTEGER NOT NULL,
    room_code VARCHAR(20) NOT NULL UNIQUE, room_type VARCHAR(20) DEFAULT 'one_to_one',
    host_id INTEGER NOT NULL, host_name VARCHAR(200) DEFAULT '',
    batch_id INTEGER, student_id INTEGER, title VARCHAR(300) DEFAULT '',
    active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP, duration_seconds INTEGER DEFAULT 0,
    participant_count INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS call_participants (
    id SERIAL PRIMARY KEY, room_id INTEGER NOT NULL,
    room_code VARCHAR(20) NOT NULL, student_id INTEGER,
    participant_name VARCHAR(200) DEFAULT '', role VARCHAR(20) DEFAULT 'student',
    joined_at TIMESTAMP DEFAULT NOW(), left_at TIMESTAMP,
    institute_id INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY, student_id INTEGER NOT NULL,
    institute_id INTEGER NOT NULL, endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL, auth TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
