import { useState, useMemo, useEffect } from 'react';
import { Download, Eye, FileText, BookOpen, Search, X } from 'lucide-react';
import ScreenHeader from '@/components/ui/ScreenHeader';
import PdfViewerModal from '@/components/PdfViewerModal';
import { supabase } from '@/lib/supabase';
import { useStudentProfile } from '@/lib/useStudentProfile';
import { effectiveSubjects } from '@/lib/subjects';
import type { LibraryRow } from '@/lib/supabase';
import { buildPdf, downloadPdf, pdfBlobUrl } from '@/lib/pdf';

interface LibraryScreenProps {
  onBack: () => void;
  studentId: string;
}

export default function LibraryScreen({ onBack, studentId }: LibraryScreenProps) {
  const { row } = useStudentProfile(studentId);
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [materials, setMaterials] = useState<LibraryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null);

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
          .from('library_materials')
          .select('*')
          .eq('class_name', row.class_name)
          .in('subject', subs)
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!cancelled) setMaterials(data ?? []);
      } catch {
        if (!cancelled) setMaterials([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [row]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return materials.filter((item) => {
      const matchesSubject = filter === 'All' || item.subject === filter;
      const matchesSearch =
        !term ||
        item.title.toLowerCase().includes(term) ||
        item.subject.toLowerCase().includes(term) ||
        item.material_type.toLowerCase().includes(term) ||
        item.year.includes(term);
      return matchesSubject && matchesSearch;
    });
  }, [materials, filter, search]);

  // Reset filter if it's no longer valid (e.g. profile changed)
  useEffect(() => {
    if (filter !== 'All' && !filters.includes(filter)) {
      setFilter('All');
    }
  }, [filters, filter]);

  const generatePdf = (item: LibraryRow) => {
    return buildPdf({
      title: item.material_type === 'Question Paper' ? 'Question Paper' : 'Revision Notes',
      subtitle: item.title,
      studentLabel: 'Student',
      studentId,
    });
  };

  const handleView = (item: LibraryRow) => {
    const doc = generatePdf(item);
    setPreview({ url: pdfBlobUrl(doc), title: item.title });
  };

  const handleDownload = (item: LibraryRow) => {
    const doc = generatePdf(item);
    downloadPdf(doc, `SIR-${item.id}-${item.title.replace(/\s+/g, '-')}.pdf`);
  };

  return (
    <>
      <ScreenHeader title="Library" onBack={onBack} />

      <div className="px-4 pb-4 pt-4">
        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes, papers, subjects…"
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 text-sm font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Subject filters */}
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

        {/* Results count */}
        <p className="mb-3 text-xs font-semibold text-gray-400">
          {filtered.length} {filtered.length === 1 ? 'file' : 'files'} found
        </p>

        {/* Library items */}
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 ring-1 ring-gray-100">
              Loading materials…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-gray-100">
              <Search className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm font-bold text-gray-500">No materials published yet</p>
              <p className="mt-1 text-xs text-gray-400">
                {filter === 'All'
                  ? 'Check back later for new study materials.'
                  : `No materials found for ${filter}.`}
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const isPaper = item.material_type === 'Question Paper';
              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                        isPaper ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'
                      }`}
                    >
                      {isPaper ? (
                        <FileText className="h-5 w-5" />
                      ) : (
                        <BookOpen className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-extrabold text-gray-900">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {item.subject} · {item.year}
                      </p>
                      <span
                        className={`mt-1.5 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          isPaper ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                        }`}
                      >
                        {item.material_type}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleView(item)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition-all hover:border-brand-300 hover:text-brand-500 active:scale-95"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(item)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-brand-600 active:scale-95"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download PDF
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <PdfViewerModal
        open={!!preview}
        url={preview?.url ?? ''}
        title={preview?.title ?? ''}
        onDownload={() => {
          if (preview) {
            const item = materials.find((i) => i.title === preview.title);
            if (item) handleDownload(item);
          }
        }}
        onClose={() => setPreview(null)}
      />
    </>
  );
}
