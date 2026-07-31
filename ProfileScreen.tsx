import {
  LogOut,
  User,
  Hash,
  Cake,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Users,
  CalendarCheck,
  Loader2,
} from 'lucide-react';
import ScreenHeader from '@/components/ui/ScreenHeader';
import { useStudentProfile } from '@/lib/useStudentProfile';
interface ProfileScreenProps {
  onBack: () => void;
  onSignOut: () => void;
  studentId: string;
  studentDob: string;
}

interface DetailRow {
  icon: typeof User;
  label: string;
  value: string;
}

export default function ProfileScreen({
  onBack,
  onSignOut,
  studentId,
}: ProfileScreenProps) {
  const { row, loading } = useStudentProfile(studentId);

  if (loading) {
    return (
      <>
        <ScreenHeader title="Profile" onBack={onBack} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24">
          <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
          <p className="text-sm text-gray-400">Loading profile…</p>
        </div>
      </>
    );
  }

  const name = row?.name ?? 'Student';
  const photoUrl = row?.photo_url ?? null;
  const addressParts = [row?.village, row?.po, row?.ps, row?.district].filter(Boolean);
  const address = addressParts.length ? addressParts.join(', ') : '—';

  const details: DetailRow[] = [
    { icon: Hash, label: 'Student ID', value: row?.student_id ?? studentId },
    { icon: Cake, label: 'Date of Birth', value: row?.dob ?? '—' },
    { icon: Phone, label: 'Contact Number', value: row?.phone ?? '—' },
    { icon: Mail, label: 'Email', value: row?.email ?? '—' },
    { icon: MapPin, label: 'Address', value: address },
    {
      icon: GraduationCap,
      label: 'Class',
      value: row ? `${row.class_name} · Sec ${row.section}` : '—',
    },
    { icon: Users, label: "Father's Name", value: row?.father_name ?? '—' },
    { icon: Users, label: "Mother's Name", value: row?.mother_name ?? '—' },
    { icon: CalendarCheck, label: 'Admission Date', value: row?.admission_date ?? '—' },
  ];

  return (
    <>
      <ScreenHeader title="Profile" onBack={onBack} />

      <div className="px-4 pb-4 pt-4">
        {/* Profile header card */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-400 p-6 text-center text-white shadow-glow">
          <div className="mx-auto grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-white/20 ring-4 ring-white/30">
            {photoUrl ? (
              <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <User className="h-10 w-10 text-white" strokeWidth={1.5} />
            )}
          </div>
          <p className="mt-3 font-display text-xl font-extrabold">{name}</p>
          <p className="mt-0.5 text-sm text-white/85">{row?.student_id ?? studentId}</p>
          {row && (
            <span className="mt-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
              {row.class_name} · Sec {row.section}
            </span>
          )}
        </div>

        {/* Details list */}
        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          {details.map((row, i) => (
            <div
              key={row.label}
              className={`flex items-center gap-4 px-4 py-3.5 ${
                i !== details.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gray-100 text-gray-500">
                <row.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  {row.label}
                </p>
                <p className="truncate text-sm font-bold text-gray-900">{row.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sign out */}
        <button
          type="button"
          onClick={onSignOut}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3.5 font-display text-base font-bold text-red-600 transition-all hover:bg-red-100 active:scale-[0.99]"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>

        <p className="mt-4 text-center text-[11px] text-gray-400">
          SIR Academy · Est. 2016 · Student Integration &amp; Regulation
        </p>
      </div>
    </>
  );
}
