/*
# Add enrolled_subjects column to students

## Purpose
Supports the dynamic subject hierarchy: Class XI/XII students choose
their specific subjects (Nutrition, Geography, History, etc.) during
registration. Those choices are stored as an array on the student record
so the student portal can show only DPPs/materials for the subjects that
student is actually enrolled in.

## 1. Modified Tables

### `students`
- NEW column `enrolled_subjects` (text[], nullable, default NULL)
  Stores the list of subjects a Class XI/XII student is enrolled in.
  For Class V-X students this stays NULL — their subjects are fixed by
  their class and derived on the frontend.

## 2. Security
No RLS policy changes — the existing anon/authenticated policies on
`students` already cover UPDATE and SELECT for all columns, so the new
column is automatically readable and writable under the current
single-tenant shared-data model.
*/

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS enrolled_subjects text[];
