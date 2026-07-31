import { useState, useEffect, useCallback } from 'react';
import { IndianRupee, Loader2, Trash2, CheckCircle2 } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { Field, Select, Input, PrimaryButton } from '@/components/admin/Form';
import { useToasts, ToastStack } from '@/components/admin/Toast';
import { supabase } from '@/lib/supabase';
import type { StudentRow, FeeRow } from '@/lib/supabase';

const MONTHS = [
  'January 2026', 'February 2026', 'March 2026', 'April 2026', 'May 2026', 'June 2026',
  'July 2026', 'August 2026', 'September 2026', 'October 2026', 'November 2026', 'December 2026',
];

interface FeesModuleProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export default function FeesModule({ isDark, onToggleTheme }: FeesModuleProps) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentId, setStudentId] = useState('');
  const [month, setMonth] = useState(MONTHS[6]);
  const [amountPaid, setAmountPaid] = useState('');
  const [dueAmount, setDueAmount] = useState('0');
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState<FeeRow[]>([]);
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
        .from('fee_records')
        .select('*')
        .eq('student_id', studentId)
        .order('paid_on', { ascending: false });
      if (error) throw error;
      setRecords(data ?? []);
    } catch (e) {
      push('err', e instanceof Error ? e.message : 'Load failed');
    }
  }, [studentId, push]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const handleSave = async () => {
    if (!studentId || !amountPaid) {
      push('err', 'Select a student and enter amount paid.');
      return;
    }
    setSaving(true);
    try {
      const invoice = `INV-${selectedStudent?.student_id.split('/').pop()}-${month.split(' ')[0].slice(0, 3).toUpperCase()}`;
      const { error: delErr } = await supabase
        .from('fee_records')
        .delete()
        .eq('student_id', studentId)
        .eq('month', month);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase.from('fee_records').insert({
        student_id: studentId,
        month,
        amount_paid: Number(amountPaid),
        due_amount: Number(dueAmount) || 0,
        paid_on: paidOn,
        invoice_id: invoice,
      });
      if (insErr) throw insErr;
      push('ok', `Fee recorded for ${selectedStudent?.name}.`);
      setAmountPaid('');
      setDueAmount('0');
      loadRecords();
    } catch (e) {
      push('err', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('fee_records').delete().eq('id', id);
      if (error) throw error;
      push('ok', 'Fee record deleted.');
      loadRecords();
    } catch (e) {
      push('err', e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <>
      <AdminHeader
        title="Fees Management"
        subtitle="Record monthly fee payments"
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
            <Field label="Month">
              <Select value={month} onChange={(e) => setMonth(e.target.value)}>
                {MONTHS.map((m) => <option key={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Amount Paid (₹)">
              <Input type="number" min={0} value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="8500" />
            </Field>
            <Field label="Due Amount (₹)">
              <Input type="number" min={0} value={dueAmount} onChange={(e) => setDueAmount(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Payment Date">
              <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
            </Field>
            {selectedStudent && (
              <div className="flex items-end">
                <div className="w-full rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-white/5">
                  <p className="text-[10px] font-bold uppercase text-gray-400">Auto-filled</p>
                  <p className="truncate text-sm font-bold text-gray-800 dark:text-white/90">{selectedStudent.name}</p>
                  <p className="text-xs text-gray-400">DOB: {selectedStudent.dob ?? '—'}</p>
                </div>
              </div>
            )}
          </div>

          <PrimaryButton onClick={handleSave} loading={saving} className="mt-5 w-full sm:w-auto">
            <IndianRupee className="h-4 w-4" /> Record Payment
          </PrimaryButton>
        </div>

        {studentId && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
            <p className="mb-3 font-display text-sm font-extrabold text-gray-900 dark:text-white">
              {selectedStudent?.name}'s Fee History
            </p>
            {records.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No fee records yet.</p>
            ) : (
              <div className="space-y-2">
                {records.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-800 dark:text-white/90">{r.month}</p>
                      <p className="text-xs text-gray-400">
                        Paid {r.paid_on} · {r.invoice_id}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-sm font-extrabold text-gray-900 dark:text-white">
                        ₹{Number(r.amount_paid).toLocaleString('en-IN')}
                      </p>
                      {Number(r.due_amount) > 0 ? (
                        <p className="text-xs font-bold text-red-500">Due ₹{Number(r.due_amount)}</p>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" /> Cleared
                        </span>
                      )}
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
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
