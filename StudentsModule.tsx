import { useEffect, useState, useCallback } from 'react';
import { Users, Plus, Pencil, Trash2, Search, Loader2, Upload, X, Check } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { Field, Input, Select, PrimaryButton, GhostButton } from '@/components/admin/Form';
import { useToasts, ToastStack } from '@/components/admin/Toast';
import { supabase } from '@/lib/supabase';
import type { StudentRow } from '@/lib/supabase';
import type { StudentProfile } from '@/types';
import { CLASSES, isSeniorClass, SENIOR_ELECTIVES } from '@/lib/subjects';

const SECTIONS = ['A', 'B', 'C'];

function emptyForm(): StudentProfile {
  return {
    name: '', studentId: '', className: CLASSES[0], section: 'A',
    dob: '', fatherName: '', motherName: '', phone: '', email: '',
    village: '', po: '', ps: '', district: '', photoUrl: null, admissionDate: '',
    enrolledSubjects: [],
  };
}

interface StudentsModuleProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export default function StudentsModule({ isDark, onToggleTheme }: StudentsModuleProps) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toasts, push, dismiss } = useToasts();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('student_id', { ascending: true });
      if (error) throw error;
      setStudents(data ?? []);
    } catch (e) {
      push('err', e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => { load(); }, [load]);

  const filtered = students.filter((s) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      s.name.toLowerCase().includes(term) ||
      s.student_id.toLowerCase().includes(term) ||
      s.class_name.toLowerCase().includes(term)
    );
  });

  const handleDelete = async (s: StudentRow) => {
    if (!confirm(`Delete ${s.name} (${s.student_id})? This cannot be undone.`)) return;
    // Optimistic removal so the card disappears immediately.
    setStudents((prev) => prev.filter((p) => p.id !== s.id));
    try {
      const { error } = await supabase.from('students').delete().eq('id', s.id);
      if (error) throw error;
      push('ok', `${s.name} deleted.`);
    } catch (e) {
      // Restore on failure so the user sees the row come back.
      setStudents((prev) => [s, ...prev].sort((a, b) => a.student_id.localeCompare(b.student_id)));
      push('err', e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <>
      <AdminHeader
        title="Student Profiles"
        subtitle="Create and manage student records"
        isDark={isDark}
        onToggleTheme={onToggleTheme}
      />

      <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {/* toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, or class…"
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-gray-800 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white/90"
            />
          </div>
          <PrimaryButton onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Add Student
          </PrimaryButton>
        </div>

        {/* list */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" /> Loading students…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center dark:border-white/10">
            <Users className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-2 text-sm font-bold text-gray-500 dark:text-white/60">No students yet</p>
            <p className="mt-1 text-xs text-gray-400">Click "Add Student" to create the first profile.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-white p-3 transition hover:shadow-md dark:border-white/10 dark:bg-white/5 sm:gap-3 sm:p-4"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 font-bold text-brand-600 dark:bg-brand-500/20 dark:text-brand-300 sm:h-12 sm:w-12">
                  {s.photo_url ? (
                    <img src={s.photo_url} alt={s.name} className="h-full w-full object-cover" />
                  ) : (
                    s.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-extrabold text-gray-900 dark:text-white">
                    {s.name}
                  </p>
                  <p className="truncate text-xs text-gray-400 dark:text-white/50">
                    {s.student_id} · {s.class_name} · Sec {s.section}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditing(s); setShowForm(true); }}
                    aria-label="Edit"
                    className="grid h-8 w-8 place-items-center rounded-lg bg-gray-100 text-gray-600 transition hover:bg-brand-100 hover:text-brand-600 dark:bg-white/10 dark:text-white/70"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s)}
                    aria-label="Delete"
                    className="grid h-8 w-8 place-items-center rounded-lg bg-gray-100 text-gray-600 transition hover:bg-red-100 hover:text-red-600 dark:bg-white/10 dark:text-white/70"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <StudentFormModal
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
          pushToast={push}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </>
  );
}

// ── Student form modal ──────────────────────────────────────────────────────

interface StudentFormModalProps {
  editing: StudentRow | null;
  onClose: () => void;
  onSaved: () => void;
  pushToast: (type: 'ok' | 'err', msg: string) => void;
}

function StudentFormModal({ editing, onClose, onSaved, pushToast }: StudentFormModalProps) {
  const [form, setForm] = useState<StudentProfile>(() => {
    if (editing) {
      return {
        name: editing.name,
        studentId: editing.student_id,
        className: editing.class_name,
        section: editing.section,
        dob: editing.dob ?? '',
        fatherName: editing.father_name ?? '',
        motherName: editing.mother_name ?? '',
        phone: editing.phone ?? '',
        email: editing.email ?? '',
        village: editing.village ?? '',
        po: editing.po ?? '',
        ps: editing.ps ?? '',
        district: editing.district ?? '',
        photoUrl: editing.photo_url,
        admissionDate: editing.admission_date ?? '',
        enrolledSubjects: editing.enrolled_subjects ?? [],
      };
    }
    return emptyForm();
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const set = (key: keyof StudentProfile, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleElective = (subj: string) =>
    setForm((prev) => {
      const has = prev.enrolledSubjects.includes(subj);
      return {
        ...prev,
        enrolledSubjects: has
          ? prev.enrolledSubjects.filter((s) => s !== subj)
          : [...prev.enrolledSubjects, subj],
      };
    });

  const handlePhoto = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      pushToast('err', 'Please select an image file.');
      return;
    }
    setPhotoFile(file);
    // preview
    const reader = new FileReader();
    reader.onload = (e) => setForm((p) => ({ ...p, photoUrl: e.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (studentId: string): Promise<string | null> => {
    if (!photoFile) return form.photoUrl;
    setUploading(true);
    try {
      const ext = photoFile.name.split('.').pop() ?? 'jpg';
      const path = `${studentId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('student-photos')
        .upload(path, photoFile, { cacheControl: '3600', upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('student-photos').getPublicUrl(path);
      return pub.publicUrl;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.studentId.trim()) {
      pushToast('err', 'Name and Student ID are required.');
      return;
    }
    setSaving(true);
    try {
      const photoUrl = await uploadPhoto(form.studentId);
      const row = {
        name: form.name.trim(),
        student_id: form.studentId.trim(),
        class_name: form.className,
        section: form.section,
        dob: form.dob || null,
        father_name: form.fatherName || null,
        mother_name: form.motherName || null,
        phone: form.phone || null,
        email: form.email || null,
        village: form.village || null,
        po: form.po || null,
        ps: form.ps || null,
        district: form.district || null,
        photo_url: photoUrl,
        admission_date: form.admissionDate || null,
        enrolled_subjects: isSeniorClass(form.className) ? form.enrolledSubjects : null,
      };

      if (editing) {
        const { error } = await supabase.from('students').update(row).eq('id', editing.id);
        if (error) throw error;
        pushToast('ok', `${row.name} updated.`);
      } else {
        const { error } = await supabase.from('students').insert(row);
        if (error) throw error;
        pushToast('ok', `${row.name} added.`);
      }
      onSaved();
    } catch (e) {
      pushToast('err', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-[#121725] sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-extrabold text-gray-900 dark:text-white">
              {editing ? 'Edit Student' : 'New Student'}
            </h2>
            <p className="text-xs text-gray-400">All fields persist to the database instantly.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 dark:bg-white/10 dark:text-white/70"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Photo */}
        <div className="mb-5 flex items-center gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 text-2xl font-bold text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
            {form.photoUrl ? (
              <img src={form.photoUrl} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              form.name.charAt(0).toUpperCase() || '?'
            )}
          </div>
          <div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80">
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading…' : 'Upload Photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhoto(e.target.files?.[0] ?? null)}
              />
            </label>
            <p className="mt-1 text-[11px] text-gray-400">JPG / PNG · stored in cloud storage.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name"><Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Md Ruhan Sekh" /></Field>
          <Field label="Student ID"><Input value={form.studentId} onChange={(e) => set('studentId', e.target.value)} placeholder="SIR/26/00026" /></Field>
          <Field label="Class">
            <Select value={form.className} onChange={(e) => set('className', e.target.value)}>
              {CLASSES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Section">
            <Select value={form.section} onChange={(e) => set('section', e.target.value)}>
              {SECTIONS.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Date of Birth"><Input type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} /></Field>
          <Field label="Admission Date"><Input type="date" value={form.admissionDate} onChange={(e) => set('admissionDate', e.target.value)} /></Field>
          <Field label="Father's Name"><Input value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} placeholder="Mr. Imran Sekh" /></Field>
          <Field label="Mother's Name"><Input value={form.motherName} onChange={(e) => set('motherName', e.target.value)} /></Field>
          <Field label="Contact Number"><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 …" /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
        </div>

        {isSeniorClass(form.className) && (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
              Enrolled Subjects (Class XI/XII)
            </p>
            <p className="mb-3 text-xs text-gray-400">
              Select the elective subjects this student has chosen. Bengali and English are included automatically.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SENIOR_ELECTIVES.map((subj) => {
                const checked = form.enrolledSubjects.includes(subj);
                return (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => toggleElective(subj)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                      checked
                        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span
                      className={`grid h-4 w-4 shrink-0 place-items-center rounded ${
                        checked ? 'bg-brand-500 text-white' : 'bg-gray-100 text-transparent'
                      }`}
                    >
                      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    {subj}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <p className="mt-4 mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">Address</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Village"><Input value={form.village} onChange={(e) => set('village', e.target.value)} /></Field>
          <Field label="Post Office (PO)"><Input value={form.po} onChange={(e) => set('po', e.target.value)} /></Field>
          <Field label="Police Station (PS)"><Input value={form.ps} onChange={(e) => set('ps', e.target.value)} /></Field>
          <Field label="District"><Input value={form.district} onChange={(e) => set('district', e.target.value)} /></Field>
        </div>

        <div className="mt-6 flex gap-3">
          <PrimaryButton onClick={handleSave} loading={saving || uploading} className="flex-1">
            {editing ? 'Save Changes' : 'Create Student'}
          </PrimaryButton>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
        </div>
      </div>
    </div>
  );
}
