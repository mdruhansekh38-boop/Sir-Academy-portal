import { useEffect, useState } from 'react';
import { Users, FilePlus2, IndianRupee, CalendarCheck, CalendarDays, Award, TrendingUp } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { supabase } from '@/lib/supabase';

interface OverviewModuleProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

interface Counts {
  students: number;
  dpp: number;
  fees: number;
  attendance: number;
  routines: number;
  results: number;
}

export default function OverviewModule({ isDark, onToggleTheme }: OverviewModuleProps) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [recent, setRecent] = useState<{ label: string; sub: string }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [st, dpp, fees, att, rt, rs] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('dpp_sets').select('*', { count: 'exact', head: true }),
          supabase.from('fee_records').select('*', { count: 'exact', head: true }),
          supabase.from('attendance_records').select('*', { count: 'exact', head: true }),
          supabase.from('routine_slots').select('*', { count: 'exact', head: true }),
          supabase.from('result_summaries').select('*', { count: 'exact', head: true }),
        ]);
        setCounts({
          students: st.count ?? 0,
          dpp: dpp.count ?? 0,
          fees: fees.count ?? 0,
          attendance: att.count ?? 0,
          routines: rt.count ?? 0,
          results: rs.count ?? 0,
        });

        // recent students
        const { data: recentStudents } = await supabase
          .from('students')
          .select('name, student_id, class_name, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
        setRecent(
          (recentStudents ?? []).map((s) => ({
            label: s.name,
            sub: `${s.student_id} · ${s.class_name}`,
          })),
        );
      } catch {
        setCounts({ students: 0, dpp: 0, fees: 0, attendance: 0, routines: 0, results: 0 });
      }
    })();
  }, []);

  const cards = [
    { label: 'Students', value: counts?.students, icon: Users, color: 'from-sky-400 to-sky-500' },
    { label: 'DPP Sets', value: counts?.dpp, icon: FilePlus2, color: 'from-violet-400 to-violet-500' },
    { label: 'Fee Records', value: counts?.fees, icon: IndianRupee, color: 'from-emerald-400 to-emerald-500' },
    { label: 'Attendance', value: counts?.attendance, icon: CalendarCheck, color: 'from-amber-400 to-amber-500' },
    { label: 'Routine Slots', value: counts?.routines, icon: CalendarDays, color: 'from-rose-400 to-rose-500' },
    { label: 'Report Cards', value: counts?.results, icon: Award, color: 'from-brand-400 to-brand-500' },
  ];

  return (
    <>
      <AdminHeader
        title="Overview"
        subtitle="SIR Academy management dashboard"
        isDark={isDark}
        onToggleTheme={onToggleTheme}
      />

      <div className="space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {/* stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
            >
              <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${c.color} text-white`}>
                <c.icon className="h-5 w-5" />
              </div>
              <p className="mt-3 font-display text-2xl font-extrabold text-gray-900 dark:text-white">
                {c.value === undefined ? '—' : c.value}
              </p>
              <p className="text-xs font-semibold text-gray-400">{c.label}</p>
            </div>
          ))}
        </div>

        {/* recent students */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-500" />
            <p className="font-display text-sm font-extrabold text-gray-900 dark:text-white">
              Recently Added Students
            </p>
          </div>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No students yet.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-2.5 dark:bg-white/5"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
                    {r.label.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-800 dark:text-white/90">{r.label}</p>
                    <p className="truncate text-xs text-gray-400">{r.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
