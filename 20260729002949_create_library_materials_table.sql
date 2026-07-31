/*
# Create library_materials table

## Purpose
Replaces the old hardcoded demo library data (Physics, Chemistry, Math,
Biology) with a real database-backed library. Admin publishes study
materials (question papers, revision notes) tagged by class and subject.
Students see only materials matching their class and their enrolled
subjects.

## 1. New Table

### `library_materials`
- `id` (uuid, PK)
- `class_name` (text) — which class this material belongs to
- `subject` (text) — subject tag (must match the official subject hierarchy)
- `title` (text) — display title, e.g. "Bengali — Full Mock Test"
- `material_type` (text) — 'Question Paper' | 'Revision Notes'
- `year` (text) — e.g. "2025"
- `created_at` (timestamptz)

## 2. Security
Single-tenant shared-data model (same as all other tables in this app).
RLS enabled with anon+authenticated CRUD using USING(true) / WITH CHECK(true).
*/

CREATE TABLE IF NOT EXISTS library_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name text NOT NULL,
  subject text NOT NULL,
  title text NOT NULL,
  material_type text NOT NULL DEFAULT 'Revision Notes',
  year text NOT NULL DEFAULT '2025',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE library_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_library" ON library_materials;
CREATE POLICY "anon_read_library" ON library_materials FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_write_library" ON library_materials;
CREATE POLICY "anon_write_library" ON library_materials FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_library" ON library_materials;
CREATE POLICY "anon_delete_library" ON library_materials FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_library_class ON library_materials (class_name);
CREATE INDEX IF NOT EXISTS idx_library_subject ON library_materials (subject);
