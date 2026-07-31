import { useState, useEffect, useCallback } from 'react';
import { Award, Plus, Trash2, Loader2, Save, Calculator } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { Field, Select, Input, PrimaryButton, GhostButton } from '@/components/admin/Form';
import { useToasts, ToastStack } from '@/components/admin/Toast';
import { supabase } from '@/lib/supabase';
import type { StudentRow, ExamRow, ResultSummaryRow } from '@/lib/supabase';
import { effectiveSubjects } from '@/lib/subjects';

interface ResultsModuleProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

interface SubjectEntry {
  subject: string;
  obtained: string;
  total: string;
}

function gradeFor(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}

export default function ResultsModule({ isDark, onToggleTheme }: ResultsModuleProps) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [studentId, setStudentId] = useState('');
  const [examId, setExamId] = useState('');
  const [entries, setEntries] = useState<SubjectEntry[]>([]);
  const [rank, setRank] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<ResultSummaryRow[]>([]);
  const { toasts, push, dismiss } = useToasts();

  const selectedStudent = students.find((s) => s.id === studentId);

  // When a student is selected, rebuild the subject entries from their class/subjects
  useEffect(() => {
    if (!selectedStudent) { setEntries([]); return; }
    const subs = effectiveSubjects(selectedStudent.class_name, selectedStudent.enrolled_subjects);
    setEntries(subs.map((subject) => ({ subject, obtained: '', total: '90' })));
  }, [selectedStudent]);

  // live calc
  const filled = entries.filter((e) => e.obtained !== '' && e.total !== '');
  const totalObtained = filled.reduce((a, e) => a + (Number(e.obtained) || 0), 0);
  const totalMax = filled.reduce((a, e) => a + (Number(e.total) || 0), 0);
  const percentage = totalMax ? Math.round((totalObtained / totalMax) * 1000) / 10 : 0;
  const grade = gradeFor(percentage);

  useEffect(() => {
    (async () => {
      try {
        const [st, ex] = await Promise.all([
          supabase.from('students').select('*').order('student_id'),
          supabase.from('exams').select('*').order('exam_date', { ascending: false }),
        ]);
        if (st.error) throw st.error;
        if (ex.error) throw ex.error;
        setStudents(st.data ?? []);
        setExams(ex.data ?? []);
        setExamId((ex.data ?? [])[0]?.id ?? '');
      } catch (e) {
        push('err', e instanceof Error ? e.message : 'Load failed');
      } finally {
        setLoading(false);
      }
    })();
  }, [push]);

  const loadSummaries = useCallback(async () => {
    if (!examId) return;
    try {
      const { data, error } = await supabase
        .from('result_summaries')
        .select('*')
        .eq('exam_id', examId)
        .order('rank', { ascending: true, nullsFirst: false });
      if (error) throw error;
      setSummaries(data ?? []);
    } catch (e) {
      push('err', e instanceof Error ? e.message : 'Load failed');
    }
  }, [examId, push]);

  useEffect(() => { loadSummaries(); }, [loadSummaries]);

  const updateEntry = (idx: number, key: keyof SubjectEntry, value: string) =>
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [key]: value } : e)));
  const addEntry = () =>
    setEntries((prev) => [...prev, { subject: '', obtained: '', total: '90' }]);
  const removeEntry = (idx: number) =>
    setEntries((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!studentId || !examId) {
      push('err', 'Select a student and an exam.');
      return;
    }
    if (filled.length === 0) {
      push('err', 'Enter at least one subject mark.');
      return;
    }
    setSaving(true);
    try {
      // 1. upsert marks (delete-then-insert per subject)
      const studentRows = filled.map((e) => ({
        exam_id: examId,
        student_id: studentId,
        subject: e.subject,
        marks_obtained: Number(e.obtained) || 0,
        total_marks: Number(e.total) || 0,
      }));
      const { error: delM } = await supabase
        .from('marks')
        .delete()
        .eq('exam_id', examId)
        .eq('student_id', studentId)
        .in('subject', filled.map((e) => e.subject));
      if (delM) throw delM;
      const { error: insM } = await supabase.from('marks').insert(studentRows);
      if (insM) throw insM;

      // 2. upsert result summary
      const { error: delS } = await supabase
        .from('result_summaries')
        .delete()
        .eq('exam_id', examId)
        .eq('student_id', studentId);
      if (delS) throw delS;
      const { error: insS } = await supabase.from('result_summaries').insert({
        exam_id: examId,
        student_id: studentId,
        total_obtained: totalObtained,
        total_max: totalMax,
        percentage,
        grade,
        rank: rank ? Number(rank) : null,
      });
      if (insS) throw insS;

      const examName = exams.find((e) => e.id === examId)?.name ?? 'exam';
      push('ok', `Results published for ${selectedStudent?.name} (${examName}).`);
      setEntries(entries.map((e) => ({ ...e, obtained: '' })));
      setRank('');
      loadSummaries();
    } catch (e) {
      push('err', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminHeader
        title="Result Section"
        subtitle="Enter offline test marks & publish report cards"
        isDark={isDark}
        onToggleTheme={onToggleTheme}
      />

      <div className="space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Student">
              <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={loading}>
                <option value="">{loading ? 'Loading…' : 'Select student'}</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.student_id} — {s.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Exam">
              <Select value={examId} onChange={(e) => setExamId(e.target.value)} disabled={loading}>
                <option value="">{loading ? 'Loading…' : 'Select exam'}</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </Select>
            </Field>
          </div>

          {selectedStudent && (
            <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-white/5">
              <p className="text-[10px] font-bold uppercase text-gray-400">Auto-filled</p>
              <p className="text-sm font-bold text-gray-800 dark:text-white/90">{selectedStudent.name}</p>
              <p className="text-xs text-gray-400">DOB: {selectedStudent.dob ?? '—'}</p>
            </div>
          )}

          {/* subject marks */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-white/50">
                Subject Marks
              </p>
              <button
                type="button"
                onClick={addEntry}
                className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-brand-600"
              >
                <Plus className="h-3.5 w-3.5" /> Add Subject
              </button>
            </div>

            <div className="flex items-center gap-2 px-1 text-[10px] font-bold uppercase text-gray-400">
              <span className="flex-1">Subject</span>
              <span className="w-24 text-right">Obtained</span>
              <span className="w-24 text-right">Total</span>
              <span className="w-8" />
            </div>

            {entries.map((e, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 dark:bg-white/5">
                <Select
                  value={e.subject}
                  onChange={(ev) => updateEntry(idx, 'subject', ev.target.value)}
                  className="flex-1"
                >
                  <option value="">Select subject</option>
                  {(selectedStudent
                    ? effectiveSubjects(selectedStudent.class_name, selectedStudent.enrolled_subjects)
                    : []
                  ).map((s) => <option key={s}>{s}</option>)}
                </Select>
                <Input
                  type="number"
                  min={0}
                  value={e.obtained}
                  onChange={(ev) => updateEntry(idx, 'obtained', ev.target.value)}
                  placeholder="0"
                  className="w-24 text-right"
                />
                <Input
                  type="number"
                  min={1}
                  value={e.total}
                  onChange={(ev) => updateEntry(idx, 'total', ev.target.value)}
                  placeholder="90"
                  className="w-24 text-right"
                />
                <button
                  type="button"
                  onClick={() => removeEntry(idx)}
                  aria-label="Remove"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-gray-400 transition hover:bg-red-100 hover:text-red-500 dark:bg-white/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* auto-calc summary */}
          <div className="mt-4 rounded-xl bg-gradient-to-br from-brand-500 to-brand-400 p-4 text-white">
            <div className="flex items-center gap-2 text-xs font-bold text-white/85">
              <Calculator className="h-4 w-4" /> Auto-Calculated
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="font-display text-lg font-extrabold">{totalObtained}</p>
                <p className="text-[10px] text-white/75">Obtained</p>
              </div>
              <div>
                <p className="font-display text-lg font-extrabold">{totalMax}</p>
                <p className="text-[10px] text-white/75">Total</p>
              </div>
              <div>
                <p className="font-display text-lg font-extrabold">{percentage}%</p>
                <p className="text-[10px] text-white/75">Percentage</p>
              </div>
              <div>
                <p className="font-display text-lg font-extrabold">{grade}</p>
                <p className="text-[10px] text-white/75">Grade</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Class Rank (manual)">
              <Input
                type="number"
                min={1}
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                placeholder="e.g. 6"
              />
            </Field>
          </div>

          <div className="mt-5 flex gap-3">
            <PrimaryButton onClick={handleSave} loading={saving} className="flex-1">
              <Save className="h-4 w-4" /> Publish Report Card
            </PrimaryButton>
            <GhostButton onClick={() => { setEntries(entries.map((e) => ({ ...e, obtained: '' }))); setRank(''); }}>
              Clear
            </GhostButton>
          </div>
        </div>

        {/* published summaries */}
        {examId && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
            <p className="mb-3 font-display text-sm font-extrabold text-gray-900 dark:text-white">
              Published Report Cards
            </p>
            {summaries.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No report cards published for this exam yet.</p>
            ) : (
              <div className="space-y-2">
                {summaries.map((r) => {
                  const stu = students.find((s) => s.id === r.student_id);
                  return (
                    <div key={r.id} className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/5">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
                        <Award className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-gray-800 dark:text-white/90">
                          {stu?.name ?? 'Student'} {stu && <span className="font-normal text-gray-400">· {stu.student_id}</span>}
                        </p>
                        <p className="text-xs text-gray-400">
                          {r.total_obtained}/{r.total_max} · {r.percentage}% · Grade {r.grade}
                          {r.rank ? ` · Rank #${r.rank}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
