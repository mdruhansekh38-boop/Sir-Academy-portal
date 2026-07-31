import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, CalendarOff, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import ScreenHeader from '@/components/ui/ScreenHeader';
import { supabase } from '@/lib/supabase';
import { useStudentProfile } from '@/lib/useStudentProfile';
import type { AttendanceRow } from '@/lib/supabase';

interface AttendanceScreenProps {
  onBack: () => void;
  studentId: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AttendanceScreen({ onBack, studentId }: AttendanceScreenProps) {
  const { row } = useStudentProfile(studentId);
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthIdx, setMonthIdx] = useState(new Date().getMonth());
  const year = 2026;

  useEffect(() => {
    if (!row) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const startDate = `${year}-${String(monthIdx + 1).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(monthIdx + 1).padStart(2, '0')}-31`;
        const { data, error } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('student_id', row.id)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true });
        if (error) throw error;
        if (!cancelled) setRecords(data ?? []);
      } catch {
        if (!cancelled) setRecords([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [row, monthIdx, year]);

  // Build a map of day -> status
  const statusMap = new Map<number, AttendanceRow['status']>();
  records.forEach((r) => {
    const day = Number(r.date.split('-')[2]);
    statusMap.set(day, r.status);
  });

  // first weekday of the month
  const firstDay = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  const totalDays = records.length;
  const presentCount = records.filter((r) => r.status === 'present').length;
  const pct = totalDays ? Math.round((presentCount / totalDays) * 100) : 0;

  const statusDot = (status: AttendanceRow['status'] | 'unknown') =>
    status === 'present' ? 'bg-emerald-400' : status === 'absent' ? 'bg-red-400' : status === 'holiday' ? 'bg-amber-400' : 'bg-gray-300';

  return (
    <>
      <ScreenHeader title="Attendance" onBack={onBack} />

      <div className="px-4 pb-4 pt-4">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
            <p className="text-sm text-gray-400">Loading attendance…</p>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-gray-100">
                <p className="font-display text-2xl font-extrabold text-gray-900">{totalDays}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-gray-400">Total Days</p>
              </div>
              <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-gray-100">
                <p className="font-display text-2xl font-extrabold text-emerald-500">{presentCount}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-gray-400">Present</p>
              </div>
              <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-gray-100">
                <p className="font-display text-2xl font-extrabold text-brand-500">{pct}%</p>
                <p className="mt-0.5 text-[11px] font-semibold text-gray-400">Overall</p>
              </div>
            </div>

            {/* Calendar */}
            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMonthIdx((m) => (m === 0 ? 11 : m - 1))}
                  className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="font-display text-base font-extrabold text-gray-900">
                  {MONTHS[monthIdx]} {year}
                </p>
                <button
                  type="button"
                  onClick={() => setMonthIdx((m) => (m === 11 ? 0 : m + 1))}
                  className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="pb-2 text-[11px] font-bold text-gray-400">{d}</div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`blank-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const status = statusMap.get(day) ?? 'unknown';
                  return (
                    <div
                      key={day}
                      className="flex aspect-square flex-col items-center justify-center rounded-xl bg-gray-50"
                    >
                      <span className="text-xs font-bold text-gray-700">{day}</span>
                      <span className={`mt-1 h-1.5 w-1.5 rounded-full ${statusDot(status)}`} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center gap-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Present
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                <XCircle className="h-4 w-4 text-red-400" /> Absent
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                <CalendarOff className="h-4 w-4 text-amber-400" /> Holiday
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                <span className="h-2.5 w-2.5 rounded-full bg-gray-300" /> Not Marked
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );
}
