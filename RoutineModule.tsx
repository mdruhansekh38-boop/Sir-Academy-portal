import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Plus, Trash2, Loader2, Clock } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { Field, Select, Input, PrimaryButton } from '@/components/admin/Form';
import { useToasts, ToastStack } from '@/components/admin/Toast';
import { supabase } from '@/lib/supabase';
import type { RoutineRow } from '@/lib/supabase';
import { CLASSES, subjectsForClass } from '@/lib/subjects';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TYPES = ['Regular', 'Practice'];

interface RoutineModuleProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

const subjectColor: Record<string, string> = {
  Physics: 'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300',
  Chemistry: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300',
  Math: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300',
  Biology: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
};

export default function RoutineModule({ isDark, onToggleTheme }: RoutineModuleProps) {
  const [className, setClassName] = useState<string>(CLASSES[0]);
  const [day, setDay] = useState('Mon');
  const [subject, setSubject] = useState<string>(subjectsForClass(CLASSES[0])[0]);
  const [timeSlot, setTimeSlot] = useState('08:00 - 09:00');
  const [classType, setClassType] = useState(TYPES[0]);
  const [teacher, setTeacher] = useState('');
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState<RoutineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toasts, push, dismiss } = useToasts();

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('routine_slots')
        .select('*')
        .eq('class_name', className)
        .order('day', { ascending: true });
      if (error) throw error;
      // sort by time within day
      const ordered = (data ?? []).sort((a, b) => {
        const dayOrder = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
        if (dayOrder !== 0) return dayOrder;
        return a.time_slot.localeCompare(b.time_slot);
      });
      setSlots(ordered);
    } catch (e) {
      push('err', e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [className, push]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const handleAdd = async () => {
    if (!teacher.trim() || !timeSlot.trim()) {
      push('err', 'Teacher name and time slot are required.');
      return;
    }
    setSaving(true);
    try {
      const { error: delErr } = await supabase
        .from('routine_slots')
        .delete()
        .eq('class_name', className)
        .eq('day', day)
        .eq('time_slot', timeSlot);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase.from('routine_slots').insert({
        class_name: className,
        day,
        subject,
        time_slot: timeSlot,
        class_type: classType,
        teacher: teacher.trim(),
      });
      if (insErr) throw insErr;
      push('ok', `${subject} added to ${day} ${timeSlot}.`);
      setTeacher('');
      loadSlots();
    } catch (e) {
      push('err', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('routine_slots').delete().eq('id', id);
      if (error) throw error;
      push('ok', 'Slot removed.');
      loadSlots();
    } catch (e) {
      push('err', e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const grouped = DAYS.map((d) => ({
    day: d,
    items: slots.filter((s) => s.day === d),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <AdminHeader
        title="Class Routine Manager"
        subtitle="Build weekly timetables per class"
        isDark={isDark}
        onToggleTheme={onToggleTheme}
      />

      <div className="space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <Field label="Day">
              <Select value={day} onChange={(e) => setDay(e.target.value)}>
                {DAYS.map((d) => <option key={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Subject">
              <Select value={subject} onChange={(e) => setSubject(e.target.value)}>
                {subjectsForClass(className).map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Time Slot">
              <Input value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} placeholder="08:00 - 09:00" />
            </Field>
            <Field label="Class Type">
              <Select value={classType} onChange={(e) => setClassType(e.target.value)}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Teacher Name">
              <Input value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="e.g. SK or Mr. Khan" />
            </Field>
          </div>

          <PrimaryButton onClick={handleAdd} loading={saving} className="mt-5 w-full sm:w-auto">
            <Plus className="h-4 w-4" /> Add Slot
          </PrimaryButton>
        </div>

        {/* weekly view */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <p className="mb-4 font-display text-sm font-extrabold text-gray-900 dark:text-white">
            {className} — Weekly Schedule
          </p>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : grouped.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No slots added yet for this class.</p>
          ) : (
            <div className="space-y-4">
              {grouped.map((g) => (
                <div key={g.day}>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-400">
                    <CalendarDays className="h-3.5 w-3.5" /> {g.day}
                  </p>
                  <div className="space-y-2">
                    {g.items.map((slot) => (
                      <div key={slot.id} className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-2.5 dark:bg-white/5">
                        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[10px] font-extrabold ${subjectColor[slot.subject] ?? 'bg-gray-100 text-gray-600'}`}>
                          {slot.subject.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-gray-800 dark:text-white/90">
                            {slot.subject} <span className="font-normal text-gray-400">· {slot.teacher}</span>
                          </p>
                          <p className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="h-3 w-3" /> {slot.time_slot}
                            <span className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              slot.class_type === 'Practice'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                                : 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'
                            }`}>{slot.class_type}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(slot.id)}
                          aria-label="Delete"
                          className="grid h-8 w-8 place-items-center rounded-lg bg-white text-gray-400 transition hover:bg-red-100 hover:text-red-500 dark:bg-white/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
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
