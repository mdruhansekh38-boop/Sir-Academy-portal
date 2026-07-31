import { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, Loader2, Trash2, CheckCircle2, XCircle, CalendarOff } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { Field, Select, Input, PrimaryButton } from '@/components/admin/Form';
import { useToasts, ToastStack } from '@/components/admin/Toast';
import { supabase } from '@/lib/supabase';
import type { StudentRow, AttendanceRow } from '@/lib/supabase';

type Status = 'present' | 'absent' | 'holiday';

interface AttendanceModuleProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

const STATUS_META: Record<Status, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
  present: { label: 'Present', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500' },
  absent: { label: 'Absent', icon: XCircle, color: 'text-red-600', bg: 'bg-red-500' },
  holiday: { label: 'Holiday', icon: CalendarOff, color: 'text-amber-600', bg: 'bg-amber-500' },
};

export default function AttendanceModule({ isDark, onToggleTheme }: AttendanceModuleProps) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentId, setStudentId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<Status>('present');
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const { toasts, push, dismiss } = useToasts();

  const selectedStudent = students.find((s) => s.id === studentId);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from('students').select('*').order('student_id');
        if (error) throw error;
        setStudents(data ?? []);
      } catch (e) {
        push('err', e instanceof Error ? e.message : 'Load failed');
      } finally {
        setLoadingStudents(false);
      }
    })();
  }, [push]);

  const loadRecords = useCallback(async () => {
    if (!studentId) return;
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false })
        .limit(20);
      if (error) throw error;
      setRecords(data ?? []);
    } catch (e) {
      push('err', e instanceof Error ? e.message : 'Load failed');
    }
  }, [studentId, push]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const handleSave = async () => {
    if (!studentId) {
      push('err', 'Select a student first.');
      return;
    }
    setSaving(true);
    try {
      const { error: delErr } = await supabase
        .from('attendance_records')
        .delete()
        .eq('student_id', studentId)
        .eq('date', date);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase.from('attendance_records').insert({
        student_id: studentId,
        date,
        status,
      });
      if (insErr) throw insErr;
      push('ok', `${selectedStudent?.name} marked ${status} for ${date}.`);
      loadRecords();
    } catch (e) {
      push('err', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('attendance_records').delete().eq('id', id);
      if (error) throw error;
      push('ok', 'Attendance record removed.');
      loadRecords();
    } catch (e) {
      push('err', e instanceof Error ? e.message : 'Delete failed');
    }
  };

  // month summary
  const monthRecords = records.filter((r) => r.date.startsWith(date.slice(0, 7)));
  const presentCount = monthRecords.filter((r) => r.status === 'present').length;
  const totalDays = monthRecords.length;

  return (
    <>
      <AdminHeader
        title="Attendance Tracker"
        subtitle="Mark daily attendance per student"
        isDark={isDark}
        onToggleTheme={onToggleTheme}
      />

      <div className="space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Student">
              <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={loadingStudents}>
                <option value="">{loadingStudents ? 'Loading…' : 'Select student'}</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.student_id} — {s.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>

          {selectedStudent && (
            <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-white/5">
              <p className="text-[10px] font-bold uppercase text-gray-400">Auto-filled</p>
              <p className="text-sm font-bold text-gray-800 dark:text-white/90">{selectedStudent.name}</p>
              <p className="text-xs text-gray-400">{selectedStudent.class_name} · Sec {selectedStudent.section}</p>
            </div>
          )}

          {/* Status selector */}
          <p className="mt-4 mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-white/50">
            Status
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(STATUS_META) as Status[]).map((s) => {
              const meta = STATUS_META[s];
              const active = status === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 transition-all ${
                    active
                      ? `${meta.bg} border-transparent text-white shadow-md`
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-white/10 dark:bg-white/5 dark:text-white/60'
                  }`}
                >
                  <meta.icon className="h-5 w-5" />
                  <span className="text-xs font-bold">{meta.label}</span>
                </button>
              );
            })}
          </div>

          <PrimaryButton onClick={handleSave} loading={saving} className="mt-5 w-full sm:w-auto">
            <CalendarCheck className="h-4 w-4" /> Mark Attendance
          </PrimaryButton>
        </div>

        {studentId && (
          <>
            {/* summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center dark:border-white/10 dark:bg-white/5">
                <p className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">{totalDays}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-gray-400">Total Days</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center dark:border-white/10 dark:bg-white/5">
                <p className="font-display text-2xl font-extrabold text-emerald-500">{presentCount}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-gray-400">Present</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center dark:border-white/10 dark:bg-white/5">
                <p className="font-display text-2xl font-extrabold text-brand-500">
                  {totalDays ? Math.round((presentCount / totalDays) * 100) : 0}%
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-gray-400">This Month</p>
              </div>
            </div>

            {/* records */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
              <p className="mb-3 font-display text-sm font-extrabold text-gray-900 dark:text-white">
                Recent Records
              </p>
              {records.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No attendance records yet.</p>
              ) : (
                <div className="space-y-2">
                  {records.map((r) => {
                    const meta = STATUS_META[r.status];
                    return (
                      <div key={r.id} className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/5">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.bg}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-800 dark:text-white/90">{r.date}</p>
                          <p className={`text-xs font-bold ${meta.color}`}>{meta.label}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          aria-label="Delete"
                          className="grid h-8 w-8 place-items-center rounded-lg bg-white text-gray-400 transition hover:bg-red-100 hover:text-red-500 dark:bg-white/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
