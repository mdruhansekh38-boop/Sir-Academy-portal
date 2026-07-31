import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { StudentRow } from '@/lib/supabase';

export interface StudentProfileData {
  row: StudentRow | null;
  loading: boolean;
  error: string | null;
}

/**
 * Loads a student profile from the database by student_id (e.g. "SIR/26/00026").
 * The student app receives this ID after login; the DB lookup replaces the old
 * hardcoded mock profile.
 */
export function useStudentProfile(studentId: string): StudentProfileData {
  const [row, setRow] = useState<StudentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!studentId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error: qErr } = await supabase
          .from('students')
          .select('*')
          .eq('student_id', studentId)
          .maybeSingle();
        if (qErr) throw qErr;
        if (cancelled) return;
        setRow(data);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Profile load failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return { row, loading, error };
}
