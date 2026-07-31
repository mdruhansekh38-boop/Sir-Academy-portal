import { useState, useEffect, useCallback } from 'react';
import { Library, Plus, Trash2, Loader2 } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { Field, Select, Input, PrimaryButton } from '@/components/admin/Form';
import { useToasts, ToastStack } from '@/components/admin/Toast';
import { supabase } from '@/lib/supabase';
import { CLASSES, subjectsForClass } from '@/lib/subjects';
import type { LibraryRow } from '@/lib/supabase';

interface LibraryModuleProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

const MATERIAL_TYPES = ['Question Paper', 'Revision Notes'] as const;
const CURRENT_YEAR = String(new Date().getFullYear());

export default function LibraryModule({ isDark, onToggleTheme }: LibraryModuleProps) {
  const [className, setClassName] = useState<string>(CLASSES[0]);
  const [subject, setSubject] = useState<string>(subjectsForClass(CLASSES[0])[0]);
  const [title, setTitle] = useState('');
  const [materialType, setMaterialType] = useState<string>(MATERIAL_TYPES[0]);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<LibraryRow[]>([]);
  const { toasts, push, dismiss } = useToasts();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('library_materials')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMaterials(data ?? []);
    } catch (e) {
      push('err', e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => { load(); }, [load]);

  const handlePublish = async () => {
    if (!title.trim()) {
      push('err', 'Enter a title.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('library_materials').insert({
        class_name: className,
        subject,
        title: title.trim(),
        material_type: materialType,
        year: year || CURRENT_YEAR,
      });
      if (error) throw error;
      push('ok', `${title.trim()} published for ${className} · ${subject}.`);
      setTitle('');
      load();
    } catch (e) {
      push('err', e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('library_materials').delete().eq('id', id);
      if (error) throw error;
      push('ok', 'Material deleted.');
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      push('err', e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <>
      <AdminHeader
        title="Library"
        subtitle="Publish question papers & revision notes by class and subject"
        isDark={isDark}
        onToggleTheme={onToggleTheme}
      />

      <div className="space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {/* Publish form */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <div className="mb-4 flex items-center gap-2">
            <Library className="h-5 w-5 text-brand-500" />
            <h3 className="font-display text-sm font-extrabold text-gray-800 dark:text-white/90">
              Publish Material
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bengali — Full Mock Test"
              />
            </Field>
            <Field label="Type">
              <Select value={materialType} onChange={(e) => setMaterialType(e.target.value)}>
                {MATERIAL_TYPES.map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Year">
              <Input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder={CURRENT_YEAR}
              />
            </Field>
          </div>

          <div className="mt-4">
            <PrimaryButton onClick={handlePublish} loading={saving}>
              <Plus className="mr-1.5 h-4 w-4" /> Publish Material
            </PrimaryButton>
          </div>
        </div>

        {/* Published materials list */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <h3 className="mb-4 font-display text-sm font-extrabold text-gray-800 dark:text-white/90">
            Published Materials
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : materials.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No materials published yet.</p>
          ) : (
            <div className="space-y-2">
              {materials.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-800 dark:text-white/90">
                      {m.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {m.class_name} · {m.subject} · {m.material_type} · {m.year}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    aria-label="Delete"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-gray-400 transition hover:bg-red-100 hover:text-red-500 dark:bg-white/10"
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
