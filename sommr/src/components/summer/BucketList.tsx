'use client';

import Link from 'next/link';
import { useOptimistic, useState, useTransition } from 'react';
import { Camera, Check, MapPin, Pencil, Plus, Ticket, Trash2 } from 'lucide-react';
import { Celebrate } from '@/components/common/Celebrate';
import { SunArc } from '@/components/ui/SunArc';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { BUCKET_SUGGESTIONS } from '@/lib/bucket-suggestions';
import { INTERESTS } from '@/lib/interests';
import { addBucketAction, deleteBucketAction, toggleBucketAction, updateBucketAction } from '@/server/actions/activity';

export interface BucketItemView {
  id: string;
  title: string;
  notes: string | null;
  suggestionSlug: string | null;
  placeId: string | null;
  placeName: string | null;
  eventId: string | null;
  eventTitle: string | null;
  completedAt: string | null;
  memoryId: string | null;
  photoId: string | null;
}

export function BucketList({ items, interests }: { items: BucketItemView[]; interests: string[] }) {
  const toast = useToast();
  const [optimistic, setOptimistic] = useOptimistic(items, (state, patch: { id: string; done: boolean }) =>
    state.map((i) => (i.id === patch.id ? { ...i, completedAt: patch.done ? new Date().toISOString() : null } : i)),
  );
  const [, start] = useTransition();
  const [adding, startAdd] = useTransition();
  const [title, setTitle] = useState('');
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const done = optimistic.filter((i) => i.completedAt).length;
  const open = optimistic.filter((i) => !i.completedAt);
  const finished = optimistic.filter((i) => i.completedAt);
  const taken = new Set(items.map((i) => i.suggestionSlug).filter(Boolean));
  const ideaInterests = interests.length ? interests : INTERESTS.map((i) => i.slug);
  const ideas = BUCKET_SUGGESTIONS.filter((s) => !taken.has(s.slug))
    .sort((a, b) => Number(!ideaInterests.includes(a.interest)) - Number(!ideaInterests.includes(b.interest)))
    .slice(0, 10);

  const toggle = (item: BucketItemView) => {
    const next = !item.completedAt;
    start(async () => {
      setOptimistic({ id: item.id, done: next });
      const r = await toggleBucketAction(item.id, next);
      if (!r.ok) return toast(r.error, { tone: 'error' });
      if (next) {
        setCelebrate(`+${r.points} points`);
        setTimeout(() => setCelebrate(null), 1500);
        toast('Ticked off!', { detail: r.earned.length ? `New badge: ${r.earned[0].title}` : 'Add a photo to remember it.' });
      }
    });
  };

  const add = (input: { title: string; suggestion?: string }) =>
    startAdd(async () => {
      const r = await addBucketAction(input);
      if (!r.ok) return toast(r.error, { tone: 'error' });
      if (r.duplicate) return toast('That’s already on your list');
      setTitle('');
      toast('Added to your bucket list', { detail: r.earned.length ? `New badge: ${r.earned[0].title}` : undefined });
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
      <div className="space-y-6">
        <div className="card relative overflow-hidden px-6 pb-6 pt-8 text-center">
          <Celebrate show={!!celebrate} label={celebrate ?? undefined} />
          <div className="mx-auto max-w-[340px]">
            <SunArc done={done} total={optimistic.length} />
          </div>
          <p className="display mt-3 text-4xl">
            {done} <span className="text-ink-3">of</span> {optimistic.length}
          </p>
          <p className="mt-1 text-sm text-ink-3">
            {optimistic.length === 0
              ? 'Add a few things you want to do before summer ends.'
              : done === optimistic.length
                ? 'Every single one. What a summer.'
                : `${optimistic.length - done} to go — the sun climbs as you tick them off.`}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim().length >= 2) add({ title: title.trim() });
          }}
          className="card p-5"
        >
          <label htmlFor="bucket-new" className="field-label">
            Add your own
          </label>
          <div className="flex gap-2">
            <input id="bucket-new" value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Swim at Kalk Bay tidal pool" maxLength={140} />
            <button type="submit" className="btn btn-primary btn-icon shrink-0" disabled={adding || title.trim().length < 2} aria-label="Add to bucket list">
              {adding ? <Spinner /> : <Plus size={20} aria-hidden="true" />}
            </button>
          </div>
        </form>

        {ideas.length ? (
          <div className="card p-5">
            <p className="field-label">Need ideas?</p>
            <ul className="flex flex-wrap gap-2">
              {ideas.map((s) => (
                <li key={s.slug}>
                  <button type="button" className="chip" disabled={adding} onClick={() => add({ title: s.title, suggestion: s.slug })}>
                    <Plus size={14} aria-hidden="true" /> {s.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="space-y-6">
        <section aria-labelledby="todo-heading">
          <h2 id="todo-heading" className="display mb-3 text-[1.9rem]">
            To do
          </h2>
          {open.length === 0 ? (
            <p className="card px-5 py-8 text-center text-sm text-ink-3">{optimistic.length ? 'All done! Add something new?' : 'Nothing yet — add your own or pick an idea.'}</p>
          ) : (
            <ul className="card divide-y divide-line">
              {open.map((i) => (
                <Row key={i.id} item={i} onToggle={() => toggle(i)} editing={editing === i.id} setEditing={setEditing} />
              ))}
            </ul>
          )}
        </section>
        {finished.length ? (
          <section aria-labelledby="done-heading">
            <h2 id="done-heading" className="display mb-3 text-[1.9rem]">
              Done
            </h2>
            <ul className="card divide-y divide-line">
              {finished.map((i) => (
                <Row key={i.id} item={i} onToggle={() => toggle(i)} editing={editing === i.id} setEditing={setEditing} />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function Row({ item, onToggle, editing, setEditing }: { item: BucketItemView; onToggle: () => void; editing: boolean; setEditing: (id: string | null) => void }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes ?? '');
  const done = !!item.completedAt;

  if (editing) {
    return (
      <li className="space-y-2 px-4 py-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" aria-label="Title" maxLength={140} />
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="textarea !min-h-20" aria-label="Notes" placeholder="Notes (optional)" maxLength={1000} />
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await updateBucketAction(item.id, title, notes || null);
                if (!r.ok) return toast(r.error, { tone: 'error' });
                setEditing(null);
              })
            }
          >
            {pending ? <Spinner /> : null} Save
          </button>
          <button type="button" className="btn btn-sm text-ink-3" onClick={() => setEditing(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm ml-auto"
            disabled={pending}
            onClick={() => {
              if (!window.confirm('Remove this from your bucket list?')) return;
              start(async () => {
                const r = await deleteBucketAction(item.id);
                if (!r.ok) toast(r.error, { tone: 'error' });
              });
            }}
          >
            <Trash2 size={14} aria-hidden="true" /> Delete
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-3 px-4 py-3.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Mark “${item.title}” as not done` : `Mark “${item.title}” as done`}
        onClick={onToggle}
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-all duration-300 ${
          done ? 'border-leaf bg-leaf text-white' : 'border-line-strong hover:border-sun hover:bg-sun-soft'
        }`}
      >
        {done ? <Check size={15} strokeWidth={3} className="pop-in" aria-hidden="true" /> : null}
      </button>
      {item.photoId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/media/${item.photoId}?size=thumb`} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium transition-colors ${done ? 'text-ink-3 line-through decoration-line-strong' : ''}`}>{item.title}</p>
        {item.notes || item.placeName || item.eventTitle ? (
          <p className="flex items-center gap-1 truncate text-xs text-ink-3">
            {item.placeName ? (
              <Link href={`/places/${item.placeId}`} className="inline-flex items-center gap-1 hover:underline">
                <MapPin size={11} aria-hidden="true" /> {item.placeName}
              </Link>
            ) : item.eventTitle ? (
              <Link href={`/events/${item.eventId}`} className="inline-flex items-center gap-1 hover:underline">
                <Ticket size={11} aria-hidden="true" /> {item.eventTitle}
              </Link>
            ) : (
              item.notes
            )}
          </p>
        ) : null}
      </div>
      {done && !item.memoryId ? (
        <Link href={`/my-summer/new?bucket=${item.id}`} className="btn btn-sm text-ink-3 hover:bg-sand hover:text-ink" aria-label={`Add a photo for ${item.title}`}>
          <Camera size={15} aria-hidden="true" />
        </Link>
      ) : null}
      {item.memoryId ? (
        <Link href={`/my-summer/memories/${item.memoryId}`} className="text-xs font-medium text-sea-deep hover:underline">
          Memory
        </Link>
      ) : null}
      <button type="button" onClick={() => setEditing(item.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-3 opacity-60 hover:bg-sand hover:opacity-100 focus:opacity-100" aria-label={`Edit ${item.title}`}>
        <Pencil size={14} aria-hidden="true" />
      </button>
    </li>
  );
}

