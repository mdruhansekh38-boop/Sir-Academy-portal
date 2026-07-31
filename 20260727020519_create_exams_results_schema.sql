/*
# Exam Results & Student Schema

## Overview
Adds the database backend for the SIR Academy offline exam result system.
Teachers/admins enter marks per exam; students see dynamic progress cards
with subject-wise marks, percentage, grade, and rank.

## 1. New Tables

### `students`
Directory of students keyed by their SIR Academy ID.
- `id` (uuid, primary key)
- `student_id` (text, unique) — human-readable ID like "SIR/26/00026"
- `name` (text)
- `class_name` (text) — e.g. "Class XI · Science"
- `section` (text) — e.g. "A"
- `created_at` (timestamptz)

### `exams`
Catalog of exams that teachers create mark entries against.
- `id` (uuid, primary key)
- `name` (text) — e.g. "Monthly Mock Test — July"
- `type` (text) — 'monthly' | 'unit' | 'term'
- `class_name` (text) — which class this exam is for
- `exam_date` (date)
- `created_at` (timestamptz)

### `marks`
One row per (exam, student, subject) — the mark-entry records.
- `id` (uuid, primary key)
- `exam_id` (uuid, FK → exams, cascade delete)
- `student_id` (uuid, FK → students, cascade delete)
- `subject` (text) — Physics | Chemistry | Math | Biology
- `marks_obtained` (numeric)
- `total_marks` (numeric)
- `created_at` (timestamptz)
- UNIQUE constraint on (exam_id, student_id, subject) so a mark can be
  re-entered/upserted without duplicates.

## 2. Indexes
- `marks` by (exam_id, student_id) — the admin table reads this way.
- `marks` by (student_id) — the student dashboard reads this way.
- `exams` by (class_name, type).
- `students` by (class_name).

## 3. Security (RLS)
This app uses a mock login (no Supabase auth session), so every request
arrives as the `anon` role. The exam/marks data is intentionally shared
across the portal, so policies use `TO anon, authenticated` with
`USING (true)` / `WITH CHECK (true)` — this is the documented
single-tenant shared-data pattern, not an ownership shortcut.

## 4. Seed Data
- 1 demo student matching the app's "Md Ruhan Sekh / SIR/26/00026".
- 4 classmates in the same class so rank has meaning.
- 2 exams (Monthly Mock Test — July, Unit Test — 2).
- Marks for all 5 students across both exams and 4 subjects, so the
  student dashboard and admin table have real data on first load.
*/

-- ── students ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text UNIQUE NOT NULL,
  name text NOT NULL,
  class_name text NOT NULL,
  section text NOT NULL DEFAULT 'A',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_students" ON students;
CREATE POLICY "anon_read_students" ON students FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_write_students" ON students;
CREATE POLICY "anon_write_students" ON students FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- ── exams ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  class_name text NOT NULL,
  exam_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_exams" ON exams;
CREATE POLICY "anon_read_exams" ON exams FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_write_exams" ON exams;
CREATE POLICY "anon_write_exams" ON exams FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- ── marks ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject text NOT NULL,
  marks_obtained numeric NOT NULL,
  total_marks numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (exam_id, student_id, subject)
);

ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_marks" ON marks;
CREATE POLICY "anon_read_marks" ON marks FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_write_marks" ON marks;
CREATE POLICY "anon_write_marks" ON marks FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_marks" ON marks;
CREATE POLICY "anon_update_marks" ON marks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_marks_exam_student
  ON marks (exam_id, student_id);
CREATE INDEX IF NOT EXISTS idx_marks_student
  ON marks (student_id);
CREATE INDEX IF NOT EXISTS idx_exams_class_type
  ON exams (class_name, type);
CREATE INDEX IF NOT EXISTS idx_students_class
  ON students (class_name);

-- ── Seed: students ───────────────────────────────────────────────────────
INSERT INTO students (student_id, name, class_name, section) VALUES
  ('SIR/26/00026', 'Md Ruhan Sekh', 'Class XI · Science', 'A'),
  ('SIR/26/00027', 'Ananya Gupta', 'Class XI · Science', 'A'),
  ('SIR/26/00028', 'Rahul Verma', 'Class XI · Science', 'A'),
  ('SIR/26/00029', 'Sneha Patil', 'Class XI · Science', 'A'),
  ('SIR/26/00030', 'Arjun Nair', 'Class XI · Science', 'A')
ON CONFLICT (student_id) DO NOTHING;

-- ── Seed: exams ───────────────────────────────────────────────────────────
INSERT INTO exams (name, type, class_name, exam_date) VALUES
  ('Monthly Mock Test — July', 'monthly', 'Class XI · Science', '2026-07-20'),
  ('Unit Test — 2', 'unit', 'Class XI · Science', '2026-07-12')
ON CONFLICT DO NOTHING;

-- ── Seed: marks ───────────────────────────────────────────────────────────
-- Use a DO block so we can resolve exam/student ids by name and upsert.
DO $$
DECLARE
  mmt uuid;
  ut  uuid;
  s_ruhan   uuid;
  s_ananya  uuid;
  s_rahul   uuid;
  s_sneha   uuid;
  s_arjun   uuid;
BEGIN
  SELECT id INTO mmt  FROM exams WHERE name = 'Monthly Mock Test — July';
  SELECT id INTO ut   FROM exams WHERE name = 'Unit Test — 2';

  SELECT id INTO s_ruhan  FROM students WHERE student_id = 'SIR/26/00026';
  SELECT id INTO s_ananya FROM students WHERE student_id = 'SIR/26/00027';
  SELECT id INTO s_rahul  FROM students WHERE student_id = 'SIR/26/00028';
  SELECT id INTO s_sneha  FROM students WHERE student_id = 'SIR/26/00029';
  SELECT id INTO s_arjun  FROM students WHERE student_id = 'SIR/26/00030';

  -- Monthly Mock Test — July (each subject out of 90)
  INSERT INTO marks (exam_id, student_id, subject, marks_obtained, total_marks) VALUES
    (mmt, s_ruhan,  'Physics',   78, 90),
    (mmt, s_ruhan,  'Chemistry', 72, 90),
    (mmt, s_ruhan,  'Math',      80, 90),
    (mmt, s_ruhan,  'Biology',   56, 90),
    (mmt, s_ananya, 'Physics',   85, 90),
    (mmt, s_ananya, 'Chemistry', 80, 90),
    (mmt, s_ananya, 'Math',      88, 90),
    (mmt, s_ananya, 'Biology',   82, 90),
    (mmt, s_rahul,  'Physics',   72, 90),
    (mmt, s_rahul,  'Chemistry', 68, 90),
    (mmt, s_rahul,  'Math',      75, 90),
    (mmt, s_rahul,  'Biology',   70, 90),
    (mmt, s_sneha,  'Physics',   90, 90),
    (mmt, s_sneha,  'Chemistry', 84, 90),
    (mmt, s_sneha,  'Math',      78, 90),
    (mmt, s_sneha,  'Biology',   88, 90),
    (mmt, s_arjun,  'Physics',   65, 90),
    (mmt, s_arjun,  'Chemistry', 60, 90),
    (mmt, s_arjun,  'Math',      70, 90),
    (mmt, s_arjun,  'Biology',   62, 90)
  ON CONFLICT (exam_id, student_id, subject) DO UPDATE
    SET marks_obtained = EXCLUDED.marks_obtained,
        total_marks = EXCLUDED.total_marks;

  -- Unit Test — 2 (each subject out of 50)
  INSERT INTO marks (exam_id, student_id, subject, marks_obtained, total_marks) VALUES
    (ut, s_ruhan,  'Physics',   42, 50),
    (ut, s_ruhan,  'Chemistry', 38, 50),
    (ut, s_ruhan,  'Math',      44, 50),
    (ut, s_ruhan,  'Biology',   28, 50),
    (ut, s_ananya, 'Physics',   46, 50),
    (ut, s_ananya, 'Chemistry', 44, 50),
    (ut, s_ananya, 'Math',      48, 50),
    (ut, s_ananya, 'Biology',   42, 50),
    (ut, s_rahul,  'Physics',   40, 50),
    (ut, s_rahul,  'Chemistry', 35, 50),
    (ut, s_rahul,  'Math',      38, 50),
    (ut, s_rahul,  'Biology',   36, 50),
    (ut, s_sneha,  'Physics',   48, 50),
    (ut, s_sneha,  'Chemistry', 45, 50),
    (ut, s_sneha,  'Math',      42, 50),
    (ut, s_sneha,  'Biology',   46, 50),
    (ut, s_arjun,  'Physics',   35, 50),
    (ut, s_arjun,  'Chemistry', 32, 50),
    (ut, s_arjun,  'Math',      36, 50),
    (ut, s_arjun,  'Biology',   30, 50)
  ON CONFLICT (exam_id, student_id, subject) DO UPDATE
    SET marks_obtained = EXCLUDED.marks_obtained,
        total_marks = EXCLUDED.total_marks;
END $$;
