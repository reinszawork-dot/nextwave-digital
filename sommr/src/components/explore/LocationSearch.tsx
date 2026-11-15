'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

export interface GeoResult {
  label: string;
  lat: number;
  lng: number;
  type: string;
  bbox: [number, number, number, number] | null;
}

/** Search towns, suburbs and landmarks in South Africa (accessible combobox). */
export function LocationSearch({ onPick, className = '' }: { onPick: (r: GeoResult) => void; className?: string }) {
  const id = useId();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) {
      setResults([]);
      setMessage(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(text)}`, { signal: ctrl.signal });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setResults(d.results);
        setMessage(d.results.length ? null : 'No matching places in South Africa.');
        setActive(-1);
        setOpen(true);
      } catch (err) {
        if (!ctrl.signal.aborted) {
          setResults([]);
          setMessage((err as Error).message || 'Search is unavailable right now.');
          setOpen(true);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 380);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const pick = (r: GeoResult) => {
    onPick(r);
    setQ(r.label.split(',')[0]);
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === 'Enter' && results.length) {
              e.preventDefault();
              pick(results[Math.max(0, active)]);
            } else if (e.key === 'Escape') setOpen(false);
          }}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
          aria-label="Search a town, suburb or landmark"
          placeholder="Search a town, suburb or landmark"
          className="input !h-12 !rounded-full !pl-11 !pr-10 shadow-[var(--shadow-card)]"
          autoComplete="off"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <Spinner className="text-ink-3" />
          ) : q ? (
            <button type="button" aria-label="Clear search" onClick={() => setQ('')} className="grid h-7 w-7 place-items-center rounded-full text-ink-3 hover:bg-sand">
              <X size={15} aria-hidden="true" />
            </button>
          ) : null}
        </span>
      </div>
      {open && (results.length > 0 || message) ? (
        <ul id={`${id}-list`} role="listbox" className="absolute inset-x-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-2xl border border-line bg-paper py-1.5 shadow-[var(--shadow-float)] fade-in">
          {results.map((r, i) => (
            <li
              key={`${r.lat},${r.lng},${i}`}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(r);
              }}
              className={`flex cursor-pointer items-start gap-3 px-4 py-2.5 text-sm ${i === active ? 'bg-sand' : 'hover:bg-sand'}`}
            >
              <MapPin size={16} className="mt-0.5 shrink-0 text-sun-deep" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{r.label.split(',')[0]}</span>
                <span className="block truncate text-xs text-ink-3">{r.label.split(',').slice(1).join(',').trim() || r.type}</span>
              </span>
            </li>
          ))}
          {message ? <li className="px-4 py-3 text-sm text-ink-3">{message}</li> : null}
        </ul>
      ) : null}
    </div>
  );
}
