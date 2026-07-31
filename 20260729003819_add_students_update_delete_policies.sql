/*
# Add missing UPDATE + DELETE RLS policies to students table

## Problem
The `students` table only had SELECT and INSERT policies. RLS blocks any
operation without a matching policy, so admin edits (UPDATE) and deletions
(DELETE) were silently rejected by Postgres RLS even though the UI called
them. This is why deleted students reappeared on refetch — the row was
never actually removed.

## Fix
Add `anon_update_students` and `anon_delete_students` policies, matching
the existing anon+authenticated shared-data model used by every other
table in this app. Child tables (marks, fee_records, attendance_records,
routine_slots, result_summaries, dpp_sets) already use ON DELETE CASCADE,
so deleting a student automatically cleans up their related rows.
*/

DROP POLICY IF EXISTS "anon_update_students" ON students;
CREATE POLICY "anon_update_students" ON students FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_students" ON students;
CREATE POLICY "anon_delete_students" ON students FOR DELETE
  TO anon, authenticated USING (true);
