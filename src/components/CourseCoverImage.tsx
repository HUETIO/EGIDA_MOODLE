import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface CourseCoverImageProps {
  imageKey: string;
  imageUrl?: string;
  alt: string;
  title: string;
  className?: string;
}

export function CourseCoverImage({
  imageKey,
  imageUrl,
  alt,
  title,
  className = 'h-48 w-full',
}: CourseCoverImageProps) {
  const [failed, setFailed] = useState(false);
  const showFallback = !imageUrl || failed;

  if (showFallback) {
    return (
      <div
        role="img"
        aria-label={alt || `Portada accesible para ${title} (${imageKey})`}
        className={`${className} relative flex flex-col justify-between overflow-hidden bg-slate-900 p-5 text-slate-100`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 25%, #3b82f6 0%, transparent 45%), radial-gradient(circle at 85% 75%, #0ea5e9 0%, transparent 40%)',
          }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-300">
          <span>Ref. {imageKey}</span>
          <span>EGIDA_MOODLE</span>
        </div>
        <div className="relative flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-slate-700 bg-slate-800/80 text-sky-300">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 break-words">
            <p className="font-display text-base font-semibold text-white leading-snug">{title}</p>
            <p className="text-xs text-slate-300">
              Placeholder accesible activo (imagen configurable no cargada)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden bg-slate-100`}>
      <img
        src={imageUrl}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
