import { useEffect, useState } from 'react';
import { Download, Clock, User, Loader2 } from 'lucide-react';
import ScreenHeader from '@/components/ui/ScreenHeader';
import { supabase } from '@/lib/supabase';
import { useStudentProfile } from '@/lib/useStudentProfile';
import type { RoutineRow } from '@/lib/supabase';
import { buildPdf, downloadPdf } from '@/lib/pdf';

interface RoutineScreenProps {
  onBack: () => void;
  studentId: string;
}

const ROUTINE_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const subjectColor: Record<string, string> = {
  Physics: 'bg-sky-100 text-sky-600',
  Chemistry: 'bg-violet-100 text-violet-600',
  Math: 'bg-rose-100 text-rose-600',
  Biology: 'bg-emerald-100 text-emerald-600',
};

export default function RoutineScreen({ onBack, studentId }: RoutineScreenProps) {
  const { row } = useStudentProfile(studentId);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
  const initialDay = ROUTINE_DAYS.includes(today) ? today : 'Mon';
  const [day, setDay] = useState(initialDay);
  const [allSlots, setAllSlots] = useState<RoutineRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!row) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('routine_slots')
          .select('*')
          .eq('class_name', row.class_name)
          .order('time_slot', { ascending: true });
        if (error) throw error;
        if (!cancelled) setAllSlots(data ?? []);
      } catch {
        if (!cancelled) setAllSlots([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [row]);

  const slots = allSlots.filter((s) => s.day === day);

  const handleDownload = () => {
    const doc = buildPdf({
      title: 'Class Routine',
      subtitle: `Weekly Timetable — ${row?.class_name ?? ''}`,
      studentLabel: 'Student',
      studentId: row?.student_id ?? studentId,
    });
    let y = 140;
    ROUTINE_DAYS.forEach((d) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(17, 24, 39);
      doc.text(d, 40, y);
      y += 18;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      const daySlots = allSlots.filter((s) => s.day === d);
      if (daySlots.length === 0) {
        doc.text('  Holiday', 40, y);
        y += 16;
      } else {
        daySlots.forEach((s) => {
          doc.text(`  ${s.time_slot}  ·  ${s.subject}  ·  ${s.class_type}  ·  ${s.teacher}`, 40, y);
          y += 16;
        });
      }
      y += 6;
    });
    downloadPdf(doc, `SIR-Routine-${(row?.student_id ?? studentId).replace(/\//g, '-')}.pdf`);
  };

  return (
    <>
      <ScreenHeader title="Routine" onBack={onBack} />

      <div className="px-4 pb-4 pt-4">
        {/* Day tabs */}
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ROUTINE_DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDay(d)}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                day === d
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-200'
                  : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
            <p className="text-sm text-gray-400">Loading routine…</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
            <p className="font-display text-base font-bold text-gray-700">Holiday</p>
            <p className="mt-1 text-sm text-gray-400">No classes scheduled for {day}.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {slots.map((slot) => (
              <div key={slot.id} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-xs font-extrabold ${subjectColor[slot.subject] ?? 'bg-gray-100 text-gray-600'}`}>
                  {slot.subject.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-extrabold text-gray-900">
                    {slot.subject}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {slot.time_slot}
                    </span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                      slot.class_type === 'Practice'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-sky-100 text-sky-700'
                    }`}>
                      {slot.class_type}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <User className="ml-auto h-3.5 w-3.5 text-gray-300" />
                  <p className="mt-0.5 font-display text-sm font-bold text-gray-600">{slot.teacher}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleDownload}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-400 py-3.5 font-display text-base font-bold text-white shadow-glow transition-all hover:-translate-y-0.5"
        >
          <Download className="h-5 w-5" />
          Download Routine PDF
        </button>
      </div>
    </>
  );
}
