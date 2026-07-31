import { useEffect, useState } from 'react';
import { Download, Trophy, TrendingUp, Percent, Loader2, Award, BarChart3 } from 'lucide-react';
import ScreenHeader from '@/components/ui/ScreenHeader';
import BarChart from '@/components/ui/BarChart';
import ProgressLineChart from '@/components/ui/ProgressLineChart';
import { supabase } from '@/lib/supabase';
import type { ExamRow, MarkRow, StudentRow } from '@/lib/supabase';
import { buildPdf, downloadPdf } from '@/lib/pdf';

interface ResultsScreenProps {
  onBack: () => void;
  studentId: string;
}

interface ExamResult {
  exam: ExamRow;
  subjects: { subject: string; score: number; max: number }[];
  totalScore: number;
  maxScore: number;
  percentage: number;
  rank: number;
  totalStudents: number;
  grade: string;
}

const subjectColor: Record<string, string> = {
  Physics: '#0EA5E9',
  Chemistry: '#8B5CF6',
  Math: '#F43F5E',
  Biology: '#10B981',
};

function gradeFor(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}

export default function ResultsScreen({ onBack, studentId }: ResultsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exams, setExams] = useState<ExamResult[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [me, setMe] = useState<StudentRow | null>(null);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: meRow, error: meErr } = await supabase
          .from('students')
          .select('*')
          .eq('student_id', studentId)
          .maybeSingle();
        if (meErr) throw meErr;
        if (!meRow) throw new Error('Student record not found.');
        if (meErr) throw meErr;
        if (cancelled) return;
        setMe(meRow);

        // all students in same class (for rank)
        const { data: classmates, error: cmErr } = await supabase
          .from('students')
          .select('*')
          .eq('class_name', meRow.class_name);
        if (cmErr) throw cmErr;

        // all exams for this class
        const { data: examRows, error: exErr } = await supabase
          .from('exams')
          .select('*')
          .eq('class_name', meRow.class_name)
          .order('exam_date', { ascending: false });
        if (exErr) throw exErr;

        // all marks across classmates for these exams
        const examIds = (examRows ?? []).map((e) => e.id);
        const classmateIds = (classmates ?? []).map((s) => s.id);
        const { data: allMarks, error: mkErr } = await supabase
          .from('marks')
          .select('*')
          .in('exam_id', examIds)
          .in('student_id', classmateIds);
        if (mkErr) throw mkErr;

        const results: ExamResult[] = (examRows ?? []).map((exam) => {
          const subjects = (allMarks ?? [])
            .filter((m) => m.exam_id === exam.id && m.student_id === meRow.id)
            .map((m) => ({
              subject: m.subject,
              score: Number(m.marks_obtained),
              max: Number(m.total_marks),
            }));
          const myTotal = subjects.reduce((a, s) => a + s.score, 0);
          const maxTotal = subjects.reduce((a, s) => a + s.max, 0);
          const pct = maxTotal ? (myTotal / maxTotal) * 100 : 0;

          const totals = (classmates ?? []).map((c: StudentRow) => {
            const t = (allMarks ?? [])
              .filter((m: MarkRow) => m.exam_id === exam.id && m.student_id === c.id)
              .reduce((a, m: MarkRow) => a + Number(m.marks_obtained), 0);
            return { id: c.id, total: t };
          });
          const sorted = totals.sort((a, b) => b.total - a.total);
          const rank = sorted.findIndex((t) => t.id === meRow.id) + 1;

          return {
            exam,
            subjects,
            totalScore: myTotal,
            maxScore: maxTotal,
            percentage: Math.round(pct * 10) / 10,
            rank,
            totalStudents: (classmates ?? []).length,
            grade: gradeFor(pct),
          };
        });

        if (cancelled) return;
        setExams(results);
        setActiveIdx(0);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load results.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loading) {
    return (
      <>
        <ScreenHeader title="Results" onBack={onBack} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24">
          <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
          <p className="text-sm text-gray-400">Loading your results…</p>
        </div>
      </>
    );
  }

  if (error || exams.length === 0) {
    return (
      <>
        <ScreenHeader title="Results" onBack={onBack} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
          <Trophy className="h-10 w-10 text-gray-300" />
          <p className="text-sm font-bold text-gray-500">
            {error ?? 'No results published yet.'}
          </p>
        </div>
      </>
    );
  }

  const current = exams[activeIdx];

  const handleDownload = () => {
    const doc = buildPdf({
      title: 'Scorecard',
      subtitle: current.exam.name,
      studentLabel: 'Student',
      studentId: me?.student_id ?? studentId,
    });
    let y = 150;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text(`Total Score: ${current.totalScore} / ${current.maxScore}`, 40, y);
    y += 18;
    doc.text(`Percentage: ${current.percentage}%`, 40, y);
    y += 18;
    doc.text(`Grade: ${current.grade}`, 40, y);
    y += 18;
    doc.text(`Class Rank: ${current.rank} of ${current.totalStudents}`, 40, y);
    y += 28;
    doc.setFontSize(11);
    doc.text('Subject-wise Breakdown', 40, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    current.subjects.forEach((s) => {
      doc.text(`${s.subject}: ${s.score} / ${s.max}`, 40, y);
      y += 16;
    });
    downloadPdf(doc, `SIR-Result-${current.exam.type}-${(me?.student_id ?? studentId).replace(/\//g, '-')}.pdf`);
  };

  // chart data
  const barData = current.subjects.map((s) => ({
    label: s.subject.slice(0, 4),
    value: s.score,
    max: s.max,
    color: subjectColor[s.subject] ?? '#E85A2A',
  }));

  // progress over exams (chronological) as percentages
  const trendData = [...exams]
    .reverse()
    .map((r) => ({
      label: r.exam.type === 'monthly' ? 'MMT' : r.exam.type === 'unit' ? 'UT' : 'Term',
      value: r.percentage,
    }));

  return (
    <>
      <ScreenHeader title="Results" onBack={onBack} />

      <div className="px-4 pb-4 pt-4">
        {/* Exam tabs */}
        <div className="mb-4 flex gap-2 overflow-x-auto rounded-xl bg-gray-100 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {exams.map((r, i) => (
            <button
              key={r.exam.id}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold transition-all ${
                i === activeIdx ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              {r.exam.name.split('—')[0].trim()}
            </button>
          ))}
        </div>

        {/* Progress summary card */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-400 p-5 text-white shadow-glow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white/85">{current.exam.name}</p>
              <p className="mt-0.5 text-xs text-white/70">
                {new Date(current.exam.exam_date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/20 font-display text-xl font-extrabold">
              {current.grade}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/15 p-3 text-center">
              <Trophy className="mx-auto h-5 w-5" />
              <p className="mt-1.5 font-display text-lg font-extrabold leading-none">
                {current.totalScore}
              </p>
              <p className="mt-1 text-[10px] font-medium text-white/75">Total Score</p>
            </div>
            <div className="rounded-xl bg-white/15 p-3 text-center">
              <Percent className="mx-auto h-5 w-5" />
              <p className="mt-1.5 font-display text-lg font-extrabold leading-none">
                {current.percentage}%
              </p>
              <p className="mt-1 text-[10px] font-medium text-white/75">Score %</p>
            </div>
            <div className="rounded-xl bg-white/15 p-3 text-center">
              <TrendingUp className="mx-auto h-5 w-5" />
              <p className="mt-1.5 font-display text-lg font-extrabold leading-none">
                #{current.rank}
              </p>
              <p className="mt-1 text-[10px] font-medium text-white/75">
                of {current.totalStudents}
              </p>
            </div>
          </div>
        </div>

        {/* Subject-wise marks bars */}
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-brand-500" />
            <p className="font-display text-sm font-extrabold text-gray-900">
              Subject-wise Marks
            </p>
          </div>
          <BarChart data={barData} />

          {/* detailed list */}
          <div className="mt-4 space-y-3">
            {current.subjects.map((s) => {
              const pct = Math.round((s.score / s.max) * 100);
              return (
                <div key={s.subject}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700">{s.subject}</span>
                    <span className="font-display font-bold text-gray-900">
                      {s.score}
                      <span className="text-gray-400">/{s.max}</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: subjectColor[s.subject] ?? '#E85A2A',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress trend across exams */}
        {exams.length > 1 && (
          <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-500" />
              <p className="font-display text-sm font-extrabold text-gray-900">
                Performance Trend
              </p>
            </div>
            <ProgressLineChart data={trendData} />
            <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-gray-400">
              <Award className="h-3.5 w-3.5 text-brand-400" />
              {trendData[trendData.length - 1].value >= trendData[0].value
                ? 'Improving across exams'
                : 'Keep pushing — review weak subjects'}
            </div>
          </div>
        )}

        {/* Download */}
        <button
          type="button"
          onClick={handleDownload}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-400 py-3.5 font-display text-base font-bold text-white shadow-glow transition-all hover:-translate-y-0.5"
        >
          <Download className="h-5 w-5" />
          Download Scorecard
        </button>
      </div>
    </>
  );
}
