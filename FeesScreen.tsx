import { useEffect, useState } from 'react';
import { Download, CheckCircle2, IndianRupee, Loader2 } from 'lucide-react';
import ScreenHeader from '@/components/ui/ScreenHeader';
import { supabase } from '@/lib/supabase';
import { useStudentProfile } from '@/lib/useStudentProfile';
import type { FeeRow } from '@/lib/supabase';
import { buildPdf, downloadPdf } from '@/lib/pdf';

interface FeesScreenProps {
  onBack: () => void;
  studentId: string;
}

export default function FeesScreen({ onBack, studentId }: FeesScreenProps) {
  const { row } = useStudentProfile(studentId);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!row) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('fee_records')
          .select('*')
          .eq('student_id', row.id)
          .order('paid_on', { ascending: false });
        if (error) throw error;
        if (!cancelled) setFees(data ?? []);
      } catch {
        if (!cancelled) setFees([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [row]);

  const totalPaid = fees.reduce((acc, f) => acc + Number(f.amount_paid), 0);
  const totalDue = fees.reduce((acc, f) => acc + Number(f.due_amount), 0);

  const handleDownload = (fee: FeeRow) => {
    const doc = buildPdf({
      title: 'Fee Receipt',
      subtitle: fee.month,
      studentLabel: 'Student',
      studentId: row?.student_id ?? studentId,
    });
    let y = 150;
    const rows: [string, string][] = [
      ['Invoice ID', fee.invoice_id ?? '—'],
      ['Student Name', row?.name ?? '—'],
      ['Month', fee.month],
      ['Amount Paid', `Rs. ${Number(fee.amount_paid).toLocaleString('en-IN')}`],
      ['Due Amount', `Rs. ${Number(fee.due_amount).toLocaleString('en-IN')}`],
      ['Payment Date', fee.paid_on],
    ];
    rows.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39);
      doc.text(label, 40, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text(value, 200, y);
      y += 20;
    });
    y += 16;
    doc.setDrawColor(229, 231, 235);
    doc.line(40, y, 555, y);
    y += 20;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(`Total Paid: Rs. ${totalPaid.toLocaleString('en-IN')}`, 40, y);

    downloadPdf(doc, `SIR-Receipt-${fee.invoice_id ?? fee.id}.pdf`);
  };

  return (
    <>
      <ScreenHeader title="Fees" onBack={onBack} />

      <div className="px-4 pb-4 pt-4">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
            <p className="text-sm text-gray-400">Loading fees…</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-400 p-5 text-white shadow-md shadow-emerald-200">
              <p className="text-sm font-medium text-white/85">Total Paid</p>
              <p className="mt-1 flex items-center font-display text-3xl font-extrabold">
                <IndianRupee className="h-6 w-6" />
                {totalPaid.toLocaleString('en-IN')}
              </p>
              {totalDue > 0 ? (
                <p className="mt-1 text-xs text-white/75">
                  Due: ₹{totalDue.toLocaleString('en-IN')}
                </p>
              ) : (
                <p className="mt-1 text-xs text-white/75">All dues cleared · No pending payments</p>
              )}
            </div>

            {fees.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 ring-1 ring-gray-100">
                No fee records yet.
              </div>
            ) : (
              <div className="space-y-3">
                {fees.map((fee) => (
                  <div key={fee.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-display text-sm font-extrabold text-gray-900">{fee.month}</p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          Paid {fee.paid_on} · {fee.invoice_id ?? '—'}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        PAID
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="flex items-center font-display text-lg font-extrabold text-gray-900">
                        <IndianRupee className="h-4 w-4 text-gray-400" />
                        {Number(fee.amount_paid).toLocaleString('en-IN')}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDownload(fee)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition-all hover:border-brand-300 hover:text-brand-500 active:scale-95"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download Receipt
                      </button>
                    </div>
                    {Number(fee.due_amount) > 0 && (
                      <p className="mt-2 text-xs font-bold text-red-500">
                        Due: ₹{Number(fee.due_amount).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
