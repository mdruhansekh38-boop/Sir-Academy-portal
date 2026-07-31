import { useState } from 'react';
import { Bell, CalendarHeart, AlertTriangle, Megaphone } from 'lucide-react';
import ScreenHeader from '@/components/ui/ScreenHeader';
import { NOTICES, NOTICE_CATEGORIES } from '@/data';
import type { Notice } from '@/data';

interface NoticesScreenProps {
  onBack: () => void;
}

type CategoryFilter = (typeof NOTICE_CATEGORIES)[number];

const categoryStyle: Record<Notice['category'], { ring: string; bg: string; text: string; icon: typeof Bell }> = {
  Announcement: { ring: 'ring-sky-100', bg: 'bg-sky-100', text: 'text-sky-600', icon: Megaphone },
  Holiday: { ring: 'ring-amber-100', bg: 'bg-amber-100', text: 'text-amber-600', icon: CalendarHeart },
  'Exam Alert': { ring: 'ring-red-100', bg: 'bg-red-100', text: 'text-red-600', icon: AlertTriangle },
};

export default function NoticesScreen({ onBack }: NoticesScreenProps) {
  const [filter, setFilter] = useState<CategoryFilter>('All');

  const filtered =
    filter === 'All' ? NOTICES : NOTICES.filter((n) => n.category === filter);

  return (
    <>
      <ScreenHeader title="Notices" onBack={onBack} />

      <div className="px-4 pb-4 pt-4">
        {/* Category pills */}
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NOTICE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                filter === c
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-200'
                  : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Notice list */}
        <div className="space-y-3">
          {filtered.map((notice) => {
            const style = categoryStyle[notice.category];
            return (
              <div
                key={notice.id}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${style.bg} ${style.text}`}
                  >
                    <style.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-sm font-extrabold text-gray-900">
                        {notice.title}
                      </p>
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ${style.ring} ${style.text}`}
                      >
                        {notice.category}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                      {notice.body}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-gray-400">
                      {notice.date}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 ring-1 ring-gray-100">
              No notices in this category.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
