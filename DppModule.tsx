import { useState, useCallback, useEffect, useMemo } from 'react';
import { FilePlus2, Trash2, Loader2, Send, ClipboardPaste, Info } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { Field, Select, Input, Textarea, PrimaryButton, GhostButton } from '@/components/admin/Form';
import { useToasts, ToastStack } from '@/components/admin/Toast';
import { supabase } from '@/lib/supabase';
import type { DppRow, DppQuestion } from '@/lib/supabase';

import { CLASSES, subjectsForClass } from '@/lib/subjects';

interface DppModuleProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

/**
 * Parse a pasted block of text into individual practice questions.
 * Supports flexible delimiters:
 *  - Explicit numbering: "1.", "1)", "Q1", "Q.1"
 *  - Blank-line separation between questions
 * Each non-empty chunk becomes one question; sub-lines (options/descriptions)
 * are preserved as ordered option lines for readable rendering.
 */
function parseQuestions(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  // Try splitting on explicit numeric / Q prefixes first.
  const numbered = normalized.split(/(?=\n\s*(?:Q\.?\s*\d+|\d+[\.\)])\s)/i);
  const cleaned = numbered
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (cleaned.length > 1) return cleaned;

  // Fall back to blank-line separation.
  const byBlank = normalized.split(/\n\s*\n+/);
  const parts = byBlank.map((chunk) => chunk.trim()).filter(Boolean);
  if (parts.length > 1) return parts;

  // Last resort: treat each non-empty line as its own question.
  return normalized.split('\n').map((l) => l.trim()).filter(Boolean);
}

function buildQuestions(raw: string): DppQuestion[] {
  return parseQuestions(raw).map((chunk) => {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    const text = lines[0] ?? chunk;
    // Remaining lines kept as descriptive option lines (for readable rendering).
    const options = lines.slice(1).filter((l) => !/^(?:Q\.?\s*\d+|\d+[\.\)])/i.test(l));
    return { text, options, correctIndex: -1, explanation: '' };
  });
}

export default function DppModule({ isDark, onToggleTheme }: DppModuleProps) {
  const [className, setClassName] = useState<string>(CLASSES[0]);
  const [subject, setSubject] = useState<string>(subjectsForClass(CLASSES[0])[0]);
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [existing, setExisting] = useState<DppRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const { toasts, push, dismiss } = useToasts();

  const loadExisting = useCallback(async () => {
    setLoadingList(true);
    try {
      const { data, error } = await supabase
        .from('dpp_sets')
        .select('*')
        .order('published_on', { ascending: false })
        .limit(10);
      if (error) throw error;
      setExisting(data ?? []);
    } catch (e) {
      push('err', e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoadingList(false);
    }
  }, [push]);

  useEffect(() => { loadExisting(); }, [loadExisting]);

  const parsedPreview = useMemo(() => buildQuestions(rawText), [rawText]);
  const questionCount = parsedPreview.length;

  const handlePublish = async () => {
    if (!title.trim()) {
      push('err', 'Add a title for this practice sheet.');
      return;
    }
    if (questionCount === 0) {
      push('err', 'Paste at least one question into the text area.');
      return;
    }
    setPublishing(true);
    try {
      const { error } = await supabase.from('dpp_sets').insert({
        class_name: className,
        subject,
        title: title.trim(),
        questions: parsedPreview,
      });
      if (error) throw error;
      push('ok', `Published "${title}" — ${questionCount} questions to ${className}.`);
      setTitle('');
      setRawText('');
      loadExisting();
    } catch (e) {
      push('err', e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawText(text);
        push('ok', 'Pasted from clipboard.');
      } else {
        push('err', 'Clipboard is empty.');
      }
    } catch {
      push('err', 'Clipboard access denied by browser.');
    }
  };

  const handleDelete = async (row: DppRow) => {
    if (!confirm(`Delete "${row.title}"?`)) return;
    try {
      const { error } = await supabase.from('dpp_sets').delete().eq('id', row.id);
      if (error) throw error;
      push('ok', 'Practice sheet deleted.');
      loadExisting();
    } catch (e) {
      push('err', e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <>
      <AdminHeader
        title="DPP Publisher"
        subtitle="Publish practice sheets as reading material"
        isDark={isDark}
        onToggleTheme={onToggleTheme}
      />

      <div className="space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {/* Setup */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Class">
              <Select
                value={className}
                onChange={(e) => {
                  const next = e.target.value;
                  setClassName(next);
                  const subs = subjectsForClass(next);
                  setSubject(subs[0] ?? '');
                }}
              >
                {CLASSES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Subject">
              <Select value={subject} onChange={(e) => setSubject(e.target.value)}>
                {subjectsForClass(className).map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Motion in a Straight Line" />
            </Field>
          </div>
        </div>

        {/* Bulk paste area */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="font-display text-sm font-extrabold text-gray-900 dark:text-white">
                Questions
              </p>
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
                {questionCount} parsed
              </span>
            </div>
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
            >
              <ClipboardPaste className="h-3.5 w-3.5" /> Paste
            </button>
          </div>

          <Textarea
            rows={14}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Paste questions here. Separate each question with a blank line or a number, e.g.\n\n1. A body covers 20 m in 4 s starting from rest. Its acceleration is?\n   a) 2.5 m/s²   b) 5 m/s²   c) 1.25 m/s²   d) 10 m/s²\ng) m/s²   b) m/s   c) km/h   d) N·s\n\n3. Which of the following is a vector quantity?\n   a) Speed   b) Distance   c) Displacement   d) Mass`}
            className="font-mono text-[13px] leading-relaxed"
          />

          <div className="mt-3 flex items-start gap-2 rounded-lg bg-brand-50/70 px-3 py-2.5 text-xs text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Questions are published as readable practice material — students see
              them as a numbered sheet grouped by subject. No interactive quiz,
              no auto-grading. Separate questions with a blank line or a leading
              number (1., 1), Q1).
            </p>
          </div>

          {/* Live parsed preview */}
          {questionCount > 0 && (
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">
                Preview ({questionCount} questions)
              </p>
              <ol className="space-y-2">
                {parsedPreview.slice(0, 4).map((q, i) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-white/80">
                    <span className="font-bold text-brand-500">{i + 1}.</span>{' '}
                    <span className="line-clamp-2">{q.text}</span>
                  </li>
                ))}
                {questionCount > 4 && (
                  <li className="text-xs font-semibold text-gray-400">
                    + {questionCount - 4} more…
                  </li>
                )}
              </ol>
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <PrimaryButton onClick={handlePublish} loading={publishing} className="flex-1">
              <Send className="h-4 w-4" /> Publish Practice Sheet
            </PrimaryButton>
            <GhostButton onClick={() => { setTitle(''); setRawText(''); }}>
              Clear
            </GhostButton>
          </div>
        </div>

        {/* Existing sets */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <p className="mb-3 font-display text-sm font-extrabold text-gray-900 dark:text-white">
            Recently Published
          </p>
          {loadingList ? (
            <div className="flex items-center gap-2 py-6 text-sm text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : existing.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No practice sheets published yet.</p>
          ) : (
            <div className="space-y-2">
              {existing.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
                    <FilePlus2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-800 dark:text-white/90">{row.title}</p>
                    <p className="text-xs text-gray-400">
                      {row.class_name} · {row.subject} · {row.published_on} · {row.questions.length} Q
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(row)}
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
      </div>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
