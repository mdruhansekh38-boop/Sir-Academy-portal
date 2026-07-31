import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Loader2, FileText } from 'lucide-react';
import ScreenHeader from '@/components/ui/ScreenHeader';
import { supabase } from '@/lib/supabase';
import { useStudentProfile } from '@/lib/useStudentProfile';
import { effectiveSubjects } from '@/lib/subjects';
import type { DppRow, DppQuestion } from '@/lib/supabase';

interface DppScreenProps {
  onBack: () => void;
  studentId: string;
}

type Filter = string;

const SUBJECT_COLOR: Record<string, string> = {
  Physics: 'bg-sky-100 text-sky-600',
  Chemistry: 'bg-violet-100 text-violet-600',
  Math: 'bg-rose-100 text-rose-600',
  Biology: 'bg-emerald-100 text-emerald-600',
  English: 'bg-amber-100 text-amber-600',
  'Mathematics': 'bg-rose-100 text-rose-600',
  Bengali: 'bg-orange-100 text-orange-600',
  'Environmental Science': 'bg-green-100 text-green-600',
  'Environment & Science': 'bg-green-100 text-green-600',
  Geography: 'bg-blue-100 text-blue-600',
  History: 'bg-amber-100 text-amber-600',
  'Life Science': 'bg-emerald-100 text-emerald-600',
  'Physical Science': 'bg-cyan-100 text-cyan-600',
  Nutrition: 'bg-lime-100 text-lime-600',
  'Pol. Science': 'bg-indigo-100 text-indigo-600',
  Philosophy: 'bg-purple-100 text-purple-600',
  Education: 'bg-teal-100 text-teal-600',
  Mixed: 'bg-gray-200 text-gray-600',
};

export default function DppScreen({ onBack, studentId }: DppScreenProps) {
  const { row } = useStudentProfile(studentId);
  const [filter, setFilter] = useState<Filter>('All');
  const [sets, setSets] = useState<DppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSet, setActiveSet] = useState<DppRow | null>(null);

  const mySubjects = useMemo(
    () => (row ? effectiveSubjects(row.class_name, row.enrolled_subjects) : []),
    [row],
  );

  const filters: string[] = useMemo(
    () => ['All', ...mySubjects],
    [mySubjects],
  );

  useEffect(() => {
    if (!row) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const subs = effectiveSubjects(row.class_name, row.enrolled_subjects);
        const { data, error } = await supabase
          .from('dpp_sets')
          .select('*')
          .eq('class_name', row.class_name)
          .in('subject', subs)
          .order('published_on', { ascending: false });
        if (error) throw error;
        if (!cancelled) setSets(data ?? []);
      } catch {
        if (!cancelled) setSets([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [row]);

  const filtered = useMemo(() => {
    if (filter === 'All') return sets;
    return sets.filter((s) => s.subject === filter);
  }, [sets, filter]);

  // Group by subject for the list view
  const grouped = useMemo(() => {
    const map = new Map<string, DppRow[]>();
    filtered.forEach((s) => {
      const arr = map.get(s.subject) ?? [];
      arr.push(s);
      map.set(s.subject, arr);
    });
    return Array.from(map.entries());
  }, [filtered]);

  if (activeSet) {
    return <PracticeSheet set={activeSet} onBack={() => setActiveSet(null)} />;
  }

  return (
    <>
      <ScreenHeader title="Daily Practice Problems" onBack={onBack} />

      <div className="px-4 pb-4 pt-4">
        <div className="mb-4 rounded-xl bg-brand-50/70 px-3.5 py-3 text-xs text-brand-700 ring-1 ring-brand-100">
          <p className="font-bold">Reading &amp; Practice Material</p>
          <p className="mt-0.5 text-brand-600/80">
            These sheets are for self-study. Read through each question and work it out on paper.
          </p>
        </div>

        {/* Filter pills */}
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                filter === f
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-200'
                  : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
            <p className="text-sm text-gray-400">Loading practice sheets…</p>
          </div>
        ) : grouped.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 ring-1 ring-gray-100">
            No practice sheets published yet.
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([subject, subjectSets]) => (
              <div key={subject}>
                {/* Subject group header */}
                <div className="mb-3 flex items-center gap-2">
                  <span className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-extrabold ${SUBJECT_COLOR[subject] ?? 'bg-gray-100 text-gray-600'}`}>
                    {subject.slice(0, 2).toUpperCase()}
                  </span>
                  <h3 className="font-display text-sm font-extrabold uppercase tracking-wide text-gray-700">
                    {subject}
                  </h3>
                  <span className="ml-1 text-xs font-semibold text-gray-400">
                    {subjectSets.length} sheet{subjectSets.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Sheets in this subject */}
                <div className="space-y-3">
                  {subjectSets.map((set) => (
                    <button
                      key={set.id}
                      type="button"
                      onClick={() => setActiveSet(set)}
                      className="group flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-100 transition-all hover:ring-brand-200 hover:shadow-md active:scale-[0.99]"
                    >
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-500 ring-1 ring-brand-100">
                        <span className="font-display text-sm font-extrabold">
                          {set.questions.length}Q
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-sm font-extrabold text-gray-900">
                          {set.title}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {set.published_on}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Practice Sheet (readable view) ──────────────────────────────────────────

function PracticeSheet({ set, onBack }: { set: DppRow; onBack: () => void }) {
  const questions: DppQuestion[] = set.questions;

  return (
    <>
      <ScreenHeader title={set.title} onBack={onBack} />

      <div className="px-4 pb-4 pt-4">
        {/* Sheet header */}
        <div className="mb-5 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 p-5 text-white shadow-glow">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <p className="font-display text-lg font-extrabold">{set.title}</p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/85">
            <span className="rounded-full bg-white/20 px-2.5 py-1">{set.subject}</span>
            <span className="rounded-full bg-white/20 px-2.5 py-1">{questions.length} Questions</span>
            <span className="rounded-full bg-white/20 px-2.5 py-1">{set.published_on}</span>
          </div>
        </div>

        <p className="mb-4 text-sm font-medium text-gray-500">
          Read each question carefully and solve on paper. This is self-practice material — no online submission.
        </p>

        {/* Numbered questions */}
        <div className="space-y-4">
          {questions.map((question, qi) => (
            <div
              key={qi}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
            >
              <div className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-500 text-sm font-extrabold text-white">
                  {qi + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-bold leading-relaxed text-gray-900">
                    {question.text}
                  </p>

                  {/* Render option/description lines if present */}
                  {question.options.length > 0 && (
                    <ol className="mt-3 space-y-1.5">
                      {question.options.map((opt, oi) => (
                        <li
                          key={oi}
                          className="flex items-start gap-2.5 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700"
                        >
                          <span className="font-bold text-brand-500">
                            {String.fromCharCode(97 + oi)})
                          </span>
                          <span className="flex-1">{opt}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-gray-50 py-3 text-xs font-semibold text-gray-400 ring-1 ring-gray-100">
          <FileText className="h-4 w-4" />
          End of practice sheet · Solve and verify with your teacher
        </div>

        <button
          type="button"
          onClick={onBack}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3.5 font-display text-base font-bold text-gray-700 transition-all hover:bg-gray-50"
        >
          <ChevronLeft className="h-5 w-5" /> Back to Sheets
        </button>
      </div>
    </>
  );
}
