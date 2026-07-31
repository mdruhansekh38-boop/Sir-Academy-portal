import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

// ── Row types (match the migration schema) ──────────────────────────────────

export interface StudentRow {
  id: string;
  student_id: string;
  name: string;
  class_name: string;
  section: string;
  dob: string | null;
  father_name: string | null;
  mother_name: string | null;
  phone: string | null;
  email: string | null;
  village: string | null;
  po: string | null;
  ps: string | null;
  district: string | null;
  photo_url: string | null;
  admission_date: string | null;
  enrolled_subjects: string[] | null;
  created_at: string;
}

export interface ExamRow {
  id: string;
  name: string;
  type: string;
  class_name: string;
  exam_date: string;
  created_at: string;
}

export interface MarkRow {
  id: string;
  exam_id: string;
  student_id: string;
  subject: string;
  marks_obtained: number;
  total_marks: number;
  created_at: string;
}

export interface DppRow {
  id: string;
  class_name: string;
  subject: string;
  title: string;
  published_on: string;
  questions: DppQuestion[];
  created_at: string;
}

export interface DppQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface FeeRow {
  id: string;
  student_id: string;
  month: string;
  amount_paid: number;
  due_amount: number;
  paid_on: string;
  invoice_id: string | null;
  created_at: string;
}

export interface AttendanceRow {
  id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'holiday';
  created_at: string;
}

export interface RoutineRow {
  id: string;
  class_name: string;
  day: string;
  subject: string;
  time_slot: string;
  class_type: 'Regular' | 'Practice';
  teacher: string;
  created_at: string;
}

export interface ResultSummaryRow {
  id: string;
  exam_id: string;
  student_id: string;
  total_obtained: number;
  total_max: number;
  percentage: number;
  grade: string | null;
  rank: number | null;
  created_at: string;
}

export interface LibraryRow {
  id: string;
  class_name: string;
  subject: string;
  title: string;
  material_type: string;
  year: string;
  created_at: string;
}

export interface TeacherRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
}
