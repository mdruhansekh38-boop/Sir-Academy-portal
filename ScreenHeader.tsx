import { ArrowLeft } from 'lucide-react';

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
}

export default function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-md">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to home"
        className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-gray-600 transition-all hover:bg-gray-200 hover:text-gray-900 active:scale-95"
      >
        <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
      </button>
      <h1 className="font-display text-base font-extrabold tracking-tight text-gray-900">
        {title}
      </h1>
    </header>
  );
}
