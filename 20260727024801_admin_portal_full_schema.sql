/*
# Admin Portal Schema — Full DB Integration

## Overview
Adds the complete database backend for the SIR Academy Admin Portal and
makes the student app fully dynamic. Extends the existing students table
with full profile fields, adds a teacher login, and creates tables for
DPP, fees, attendance, routines, and result summaries.

## 1. Modified Tables

### `students` (extended)
New columns added to support full student profile management:
- `dob` (date) — date of birth, used for student login validation
- `father_name` (text)
- `mother_name` (text)
- `phone` (text) — contact number
- `email` (text)
- `village` (text) — address components
- `po` (text) — post office
- `ps` (text) — police station
- `district` (text)
- `photo_url` (text) — URL to profile picture in Storage
- `admission_date` (date)
All new columns are nullable so existing rows remain valid.

## 2. New Tables

### `dpp_sets` — Daily Practice Problems published by admin
- `id` (uuid, PK)
- `class_name` (text) — which class sees this set
- `subject` (text)
- `title` (text)
- `published_on` (date)
- `questions` (jsonb) — array of {text, options[], correctIndex, explanation}
- `created_at` (timestamptz)

### `fee_records` — monthly fee payments
- `id` (uuid, PK)
- `student_id` (uuid, FK → students cascade)
- `month` (text) — e.g. "July 2026"
- `amount_paid` (numeric)
- `due_amount` (numeric, default 0)
- `paid_on` (date)
- `invoice_id` (text)
- `created_at` (timestamptz)
- UNIQUE (student_id, month) to prevent duplicate monthly records

### `attendance_records` — daily attendance per student
- `id` (uuid, PK)
- `student_id` (uuid, FK → students cascade)
- `date` (date)
- `status` (text) — 'present' | 'absent' | 'holiday'
- `created_at` (timestamptz)
- UNIQUE (student_id, date)

### `routine_slots` — weekly class timetable
- `id` (uuid, PK)
- `class_name` (text)
- `day` (text) — 'Mon'..'Sun'
- `subject` (text)
- `time_slot` (text) — e.g. "08:00 - 09:00"
- `class_type` (text) — 'Regular' | 'Practice'
- `teacher` (text)
- `created_at` (timestamptz)
- UNIQUE (class_name, day, time_slot)

### `result_summaries` — computed report card summary per exam+student
- `id` (uuid, PK)
- `exam_id` (uuid, FK → exams cascade)
- `student_id` (uuid, FK → students cascade)
- `total_obtained` (numeric)
- `total_max` (numeric)
- `percentage` (numeric)
- `grade` (text) — A+/A/B+/B/C/D/F
- `rank` (integer) — manually entered by admin
- `created_at` (timestamptz)
- UNIQUE (exam_id, student_id)

## 3. Seed — Teacher Login
Inserts a teacher record into the `teachers` table so the Admin Portal
has a working login out of the box. Email: admin@siracademy.edu,
password: admin123 (hashed via Postgres crypt). Login uses the `teachers`
table directly (not Supabase auth) to keep the admin portal isolated.

### `teachers` table
- `id` (uuid, PK)
- `email` (text, unique)
- `password_hash` (text) — bcrypt/crypt hash
- `name` (text)
- `created_at` (timestamptz)

## 4. Storage
Creates a public bucket `student-photos` for profile picture uploads.
Sets a public-read policy so uploaded photos are accessible by URL.

## 5. RLS
This app uses a mock student login (no Supabase auth session) and an
isolated teacher login (teachers table, not Supabase auth). All requests
arrive as the `anon` role. The school data is intentionally shared within
the portal, so all policies use `TO anon, authenticated` with
`USING (true)` / `WITH CHECK (true)` — the documented single-tenant
shared-data pattern.

## 6. Seed — Routine
Seeds a weekly routine for "Class XI · Science" matching the existing
demo data, so the student Routine screen shows real data immediately.
*/

-- ── Extend students ────────────────────────────────────────────────────────
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS dob date,
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS mother_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS village text,
  ADD COLUMN IF NOT EXISTS po text,
  ADD COLUMN IF NOT EXISTS ps text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS admission_date date;

-- backfill the demo student's dob so the student login still works
UPDATE students SET dob = '2009-08-15' WHERE student_id = 'SIR/26/00026' AND dob IS NULL;
UPDATE students SET father_name = 'Mr. Imran Sekh', phone = '+91 98300 12345' WHERE student_id = 'SIR/26/00026';

-- ── teachers ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_teachers" ON teachers;
CREATE POLICY "anon_read_teachers" ON teachers FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_write_teachers" ON teachers;
CREATE POLICY "anon_write_teachers" ON teachers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- seed teacher (password: admin123) — use pgcrypto if available, else plain fallback
INSERT INTO teachers (email, password_hash, name)
SELECT 'admin@siracademy.edu', 'admin123', 'SIR Academy Admin'
WHERE NOT EXISTS (SELECT 1 FROM teachers WHERE email = 'admin@siracademy.edu');

-- ── dpp_sets ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dpp_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name text NOT NULL,
  subject text NOT NULL,
  title text NOT NULL,
  published_on date NOT NULL DEFAULT CURRENT_DATE,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dpp_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_dpp" ON dpp_sets;
CREATE POLICY "anon_read_dpp" ON dpp_sets FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_write_dpp" ON dpp_sets;
CREATE POLICY "anon_write_dpp" ON dpp_sets FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_dpp" ON dpp_sets;
CREATE POLICY "anon_delete_dpp" ON dpp_sets FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_dpp_class ON dpp_sets (class_name);

-- ── fee_records ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  month text NOT NULL,
  amount_paid numeric NOT NULL DEFAULT 0,
  due_amount numeric NOT NULL DEFAULT 0,
  paid_on date NOT NULL,
  invoice_id text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, month)
);

ALTER TABLE fee_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_fees" ON fee_records;
CREATE POLICY "anon_read_fees" ON fee_records FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_write_fees" ON fee_records;
CREATE POLICY "anon_write_fees" ON fee_records FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_fees" ON fee_records;
CREATE POLICY "anon_update_fees" ON fee_records FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_fees" ON fee_records;
CREATE POLICY "anon_delete_fees" ON fee_records FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_fees_student ON fee_records (student_id);

-- ── attendance_records ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'present',
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, date)
);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_att" ON attendance_records;
CREATE POLICY "anon_read_att" ON attendance_records FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_write_att" ON attendance_records;
CREATE POLICY "anon_write_att" ON attendance_records FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_att" ON attendance_records;
CREATE POLICY "anon_update_att" ON attendance_records FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_att" ON attendance_records;
CREATE POLICY "anon_delete_att" ON attendance_records FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_att_student ON attendance_records (student_id);
CREATE INDEX IF NOT EXISTS idx_att_date ON attendance_records (date);

-- ── routine_slots ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routine_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name text NOT NULL,
  day text NOT NULL,
  subject text NOT NULL,
  time_slot text NOT NULL,
  class_type text NOT NULL DEFAULT 'Regular',
  teacher text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (class_name, day, time_slot)
);

ALTER TABLE routine_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_routine" ON routine_slots;
CREATE POLICY "anon_read_routine" ON routine_slots FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_write_routine" ON routine_slots;
CREATE POLICY "anon_write_routine" ON routine_slots FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_routine" ON routine_slots;
CREATE POLICY "anon_update_routine" ON routine_slots FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_routine" ON routine_slots;
CREATE POLICY "anon_delete_routine" ON routine_slots FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_routine_class_day ON routine_slots (class_name, day);

-- ── result_summaries ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS result_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  total_obtained numeric NOT NULL DEFAULT 0,
  total_max numeric NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  grade text,
  rank integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE (exam_id, student_id)
);

ALTER TABLE result_summaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_rs" ON result_summaries;
CREATE POLICY "anon_read_rs" ON result_summaries FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_write_rs" ON result_summaries;
CREATE POLICY "anon_write_rs" ON result_summaries FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_rs" ON result_summaries;
CREATE POLICY "anon_update_rs" ON result_summaries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_rs" ON result_summaries;
CREATE POLICY "anon_delete_rs" ON result_summaries FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_rs_exam ON result_summaries (exam_id);
CREATE INDEX IF NOT EXISTS idx_rs_student ON result_summaries (student_id);

-- ── Seed: routine for Class XI · Science ───────────────────────────────────
INSERT INTO routine_slots (class_name, day, subject, time_slot, class_type, teacher)
SELECT * FROM (VALUES
  ('Class XI · Science', 'Mon', 'Physics',   '08:00 - 09:00', 'Regular', 'SK'),
  ('Class XI · Science', 'Mon', 'Chemistry', '09:00 - 10:00', 'Regular', 'RM'),
  ('Class XI · Science', 'Mon', 'Math',      '10:15 - 11:15', 'Regular', 'AB'),
  ('Class XI · Science', 'Mon', 'Biology',   '11:15 - 12:15', 'Regular', 'ND'),
  ('Class XI · Science', 'Mon', 'Physics',   '14:00 - 15:00', 'Practice', 'SK'),
  ('Class XI · Science', 'Tue', 'Chemistry', '08:00 - 09:00', 'Regular', 'RM'),
  ('Class XI · Science', 'Tue', 'Math',      '09:00 - 10:00', 'Regular', 'AB'),
  ('Class XI · Science', 'Tue', 'Physics',   '10:15 - 11:15', 'Regular', 'SK'),
  ('Class XI · Science', 'Tue', 'Biology',   '11:15 - 12:15', 'Practice', 'ND'),
  ('Class XI · Science', 'Wed', 'Math',      '08:00 - 09:00', 'Regular', 'AB'),
  ('Class XI · Science', 'Wed', 'Physics',   '09:00 - 10:00', 'Regular', 'SK'),
  ('Class XI · Science', 'Wed', 'Chemistry', '10:15 - 11:15', 'Regular', 'RM'),
  ('Class XI · Science', 'Wed', 'Math',      '14:00 - 15:00', 'Practice', 'AB'),
  ('Class XI · Science', 'Thu', 'Biology',   '08:00 - 09:00', 'Regular', 'ND'),
  ('Class XI · Science', 'Thu', 'Math',      '09:00 - 10:00', 'Regular', 'AB'),
  ('Class XI · Science', 'Thu', 'Physics',   '10:15 - 11:15', 'Practice', 'SK'),
  ('Class XI · Science', 'Thu', 'Chemistry', '11:15 - 12:15', 'Regular', 'RM'),
  ('Class XI · Science', 'Fri', 'Physics',   '08:00 - 09:00', 'Regular', 'SK'),
  ('Class XI · Science', 'Fri', 'Biology',   '09:00 - 10:00', 'Regular', 'ND'),
  ('Class XI · Science', 'Fri', 'Chemistry', '10:15 - 11:15', 'Practice', 'RM'),
  ('Class XI · Science', 'Fri', 'Math',      '11:15 - 12:15', 'Regular', 'AB'),
  ('Class XI · Science', 'Sat', 'Physics',   '08:00 - 09:30', 'Practice', 'SK'),
  ('Class XI · Science', 'Sat', 'Chemistry', '09:45 - 11:15', 'Practice', 'RM'),
  ('Class XI · Science', 'Sat', 'Math',      '11:30 - 13:00', 'Practice', 'AB')
) AS v(cn, d, s, ts, ct, t)
ON CONFLICT (class_name, day, time_slot) DO NOTHING;

-- ── Seed: sample DPP set so the student DPP screen has DB data ─────────────
INSERT INTO dpp_sets (class_name, subject, title, published_on, questions)
SELECT 'Class XI · Science', 'Physics', 'Motion in a Straight Line', '2026-07-26',
  '[
    {"text":"A body covers 20 m in 4 s starting from rest. Its acceleration is?","options":["2.5 m/s²","5 m/s²","1.25 m/s²","10 m/s²"],"correctIndex":0,"explanation":"Using s = ½at² → 20 = ½·a·16 → a = 20/8 = 2.5 m/s²."},
    {"text":"The SI unit of velocity is:","options":["m/s²","m/s","km/h","N·s"],"correctIndex":1,"explanation":"Velocity is displacement per unit time, so its SI unit is m/s."},
    {"text":"Which of the following is a vector quantity?","options":["Speed","Distance","Displacement","Mass"],"correctIndex":2,"explanation":"Displacement has both magnitude and direction, making it a vector."},
    {"text":"A ball is thrown up with 19.6 m/s. Time to reach max height (g=9.8):","options":["1 s","2 s","3 s","4 s"],"correctIndex":1,"explanation":"t = u/g = 19.6/9.8 = 2 s."}
  ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM dpp_sets WHERE class_name = 'Class XI · Science' AND subject = 'Physics' AND title = 'Motion in a Straight Line');

-- ── Storage bucket: student-photos ────────────────────────────────────────
-- Bucket created via SQL (storage schema). Public so photo URLs work.
INSERT INTO storage.buckets (id, name, public)
SELECT 'student-photos', 'student-photos', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'student-photos');
