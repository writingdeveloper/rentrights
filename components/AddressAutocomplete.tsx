'use client';
import { useEffect, useRef, useState } from 'react';
import { useT } from '@/lib/i18n/LocaleProvider';

export function AddressAutocomplete({ value, onChange, onSelect }: {
  value: string;
  onChange: (text: string) => void;
  onSelect: (fullAddress: string) => void;
}) {
  const t = useT();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [queried, setQueried] = useState(false);
  const [active, setActive] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 4) {
      setSuggestions([]);
      setOpen(false);
      setQueried(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        if (value.trim() !== q) return; // stale response — input moved on
        setSuggestions(Array.isArray(json.suggestions) ? json.suggestions : []);
      } catch {
        if (value.trim() !== q) return;
        setSuggestions([]);
      } finally {
        if (value.trim() === q) {
          setLoading(false);
          setQueried(true);
          setOpen(true);
          setActive(-1);
        }
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [value]);

  function choose(addr: string) {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    onChange(addr);
    setOpen(false);
    setSuggestions([]);
    onSelect(addr);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      if (active >= 0) {
        e.preventDefault();
        choose(suggestions[active]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showList = open && (loading || queried);
  return (
    <div className="relative flex-1">
      <input
        className="w-full rounded-lg border px-3 py-2"
        placeholder={t('page.placeholder')}
        value={value}
        role="combobox"
        aria-expanded={open}
        aria-controls="address-suggestions"
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `addr-opt-${active}` : undefined}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
      />
      {showList && (
        <ul
          id="address-suggestions"
          role="listbox"
          className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {loading && suggestions.length === 0 && (
            <li className="px-3 py-3 text-sm text-gray-500">{t('suggest.loading')}</li>
          )}
          {!loading && queried && suggestions.length === 0 && (
            <li className="px-3 py-3 text-sm text-gray-500">{t('suggest.none')}</li>
          )}
          {suggestions.map((s, i) => (
            <li
              key={`${s}-${i}`}
              id={`addr-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className={`cursor-pointer px-3 py-3 text-sm ${i === active ? 'bg-blue-50' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
