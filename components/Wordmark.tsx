import { Key } from 'lucide-react';

interface WordmarkProps {
  compact?: boolean;
}

export function Wordmark({ compact = false }: WordmarkProps) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-flex items-center justify-center rounded-lg bg-primary text-white"
          style={{ width: 22, height: 22 }}
        >
          <Key size={13} strokeWidth={1.5} color="currentColor" aria-hidden="true" />
        </span>
        <span className="font-display text-primary font-semibold text-base leading-none">
          RentRights
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-flex items-center justify-center rounded-xl bg-primary text-white"
        style={{ width: 32, height: 32 }}
      >
        <Key size={18} strokeWidth={1.5} color="currentColor" aria-hidden="true" />
      </span>
      <span className="font-display text-primary font-semibold text-xl leading-none">
        RentRights
      </span>
    </span>
  );
}
