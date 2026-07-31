import { CalendarDays, CheckCircle2, XCircle, CalendarOff, CircleDashed, User, Loader2 } from 'lucide-react';
import {
  CreditCard,
  CalendarDays as CalIcon,
  FileText,
  BarChart2,
  BookMarked,
} from 'lucide-react';
import StarRating from '@/components/ui/StarRating';
import type { View } from '@/types';
import { useStudentProfile } from '@/lib/useStudentProfile';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import type { AttendanceRow } from '@/lib/supabase';

interface HomeScreenProps {
  onNavigate: (view: View) => void;
  studentId: string;
  studentDob: string;
}

const quickItems: {
  label: string;
  view: View;
  icon: typeof CreditCard;
  bg: string;
  iconColor: string;
}[] = [
  { label: 'Fees', view: 'fees', icon: CreditCard, bg: 'bg-sky-100', iconColor: 'text-sky-500' },
  { label: 'Routine', view: 'routine', icon: CalIcon, bg: 'bg-rose-100', iconColor: 'text-rose-500' },
  { label: 'Result', view: 'results', icon: FileText, bg: 'bg-amber-100', iconColor: 'text-amber-500' },
  { label: 'Attendance', view: 'attendance', icon: BarChart2, bg: 'bg-emerald-100', iconColor: 'text-emerald-500' },
  { label: 'Library', view: 'library', icon: BookMarked, bg: 'bg-violet-100', iconColor: 'text-violet-500' },
];

const performanceRows = [
  { label: 'Weekly', score: 3.7 },
  { label: 'Monthly', score: 3.4 },
  { label: 'Yearly', score: 3.4 },
];

function getFormattedDate() {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const day = now.getDate();
  const month = now.toLocaleDateString('en-US', { month: 'short' });
  return { dayName, day, month };
}

export default function HomeScreen({ onNavigate, studentId }: HomeScreenProps) {
  const { row, loading } = useStudentProfile(studentId);
  const { dayName, day, month } = getFormattedDate();
  const cleanId = studentId.replace(/^SIR\/SIR\//, 'SIR/');

  // Today's attendance status
  const [todayStatus, setTodayStatus] = useState<'present' | 'absent' | 'holiday' | 'unknown'>('unknown');

  useEffect(() => {
    if (!row) return;
    const today = new Date().toISOString().slice(0, 10);
    (async () => {
      const { data } = await supabase
        .from('attendance_records')
        .select('status')
        .eq('student_id', row.id)
        .eq('date', today)
        .maybeSingle();
      if (data) setTodayStatus(data.status as 'present' | 'absent' | 'holiday');
      else setTodayStatus('unknown');
    })();
  }, [row]);

  const displayName = row?.name ?? 'Student';
  const photoUrl = row?.photo_url ?? null;

  return (
    <div className="space-y-4 px-4 pb-4 pt-4">
      {/* Profile card */}
      <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="relative shrink-0">
          <div className="grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand-400 to-brand-500 ring-[3px] ring-brand-200">
            {loading ? (
              <Loader2 className="h-7 w-7 animate-spin text-white" />
            ) : photoUrl ? (
              <img src={photoUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <User className="h-9 w-9 text-white" strokeWidth={1.5} />
            )}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-white">
            <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
          </span>
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-extrabold leading-tight text-gray-900">
            {displayName}
          </p>
          <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 ring-1 ring-amber-100">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span className="text-xs font-bold tracking-wide text-amber-700">
              {cleanId}
            </span>
          </div>
        </div>
      </div>

      {/* Attendance status card */}
      <div
        className={`flex items-center justify-between overflow-hidden rounded-2xl p-5 shadow-md transition-colors ${
          todayStatus === 'absent'
            ? 'bg-gradient-to-r from-red-500 to-red-400 shadow-red-200'
            : todayStatus === 'holiday'
              ? 'bg-gradient-to-r from-amber-500 to-amber-400 shadow-amber-200'
              : todayStatus === 'present'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-emerald-200'
                : 'bg-gradient-to-r from-gray-400 to-gray-300 shadow-gray-200'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white/20">
            {todayStatus === 'absent' ? (
              <XCircle className="h-8 w-8 text-white" strokeWidth={2} />
            ) : todayStatus === 'holiday' ? (
              <CalendarOff className="h-8 w-8 text-white" strokeWidth={2} />
            ) : todayStatus === 'present' ? (
              <CheckCircle2 className="h-8 w-8 text-white" strokeWidth={2} />
            ) : (
              <CircleDashed className="h-8 w-8 text-white" strokeWidth={2} />
            )}
          </div>
          <div>
            <p className="font-display text-xl font-extrabold leading-tight text-white capitalize">
              {todayStatus === 'unknown' ? 'Remarks Pending' : todayStatus}
            </p>
            <p className="text-sm font-medium text-white/80">Today's Attendance</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
            {dayName}
          </p>
          <p className="font-display text-2xl font-extrabold leading-tight text-white">
            {day} {month}
          </p>
        </div>
      </div>

      {/* Performance Index */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <div className="mb-4 flex items-center gap-2">
          <svg viewBox="0 0 20 20" width="22" height="22" className="shrink-0">
            <path d="M10 1.5l2.47 5 5.53.8-4 3.9.94 5.5L10 14.3l-4.94 2.4.94-5.5-4-3.9 5.53-.8z" fill="#F59E0B" />
          </svg>
          <span className="font-display text-base font-extrabold text-gray-900">
            Performance Index
          </span>
        </div>
        <div className="space-y-2.5">
          {performanceRows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between rounded-xl bg-amber-50/70 px-4 py-3 ring-1 ring-amber-100/60"
            >
              <span className="w-16 text-sm font-semibold text-gray-500">{row.label}</span>
              <StarRating score={row.score} />
              <span className="w-8 text-right font-display text-sm font-extrabold text-gray-800">
                {row.score.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Access grid */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ring-gray-100 ring-1 shadow-sm">
        <div className="flex items-center justify-around">
          {quickItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.view)}
              className="group flex flex-col items-center gap-2 transition-transform active:scale-95"
            >
              <div
                className={`grid h-14 w-14 place-items-center rounded-2xl ${item.bg} transition-all duration-200 group-hover:scale-105 group-hover:shadow-md`}
              >
                <item.icon className={`h-7 w-7 ${item.iconColor}`} strokeWidth={1.8} />
              </div>
              <span className="text-xs font-bold text-gray-600">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="pb-2 text-center text-[11px] text-gray-400">
        SIR Academy · Est. 2016 · Student Integration &amp; Regulation
      </p>
    </div>
  );
}
