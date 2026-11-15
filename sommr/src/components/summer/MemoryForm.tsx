'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { createMemoryAction, type MemoryFormState } from '@/server/actions/memories';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Spinner } from '@/components/ui/Spinner';

const MAX_PHOTOS = 6;
const MAX_EDGE = 2400;

/** Shrink big phone photos before upload (falls back to the original if the browser can't decode it). */
async function prepare(file: File): Promise<File> {
  if (file.size < 1_500_000 && file.type === 'image/jpeg') return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.88));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export function MemoryForm({
  defaults,
}: {
  defaults: { title: string; happenedOn: string; maxDate: string; placeName: string; placeId: string; challengeId: string; bucketId: string; context: string | null };
}) {
  const [state, action] = useActionState<MemoryFormState, FormData>(createMemoryAction, {});
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  // Keep the real file input in sync with the (resized) selection.
  useEffect(() => {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f.file));
    inputRef.current.files = dt.files;
  }, [files]);
  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.url)), [files]);

  const add = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true);
    const room = MAX_PHOTOS - files.length;
    const prepared = await Promise.all([...list].slice(0, room).map(prepare));
    setFiles((xs) => [...xs, ...prepared.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    setBusy(false);
    if (pickerRef.current) pickerRef.current.value = '';
  };

  return (
    <form action={action} className="space-y-6" noValidate>
      {defaults.context ? <p className="rounded-2xl bg-sun-soft/70 px-4 py-3 text-sm text-ink-2">{defaults.context}</p> : null}
      {state.error ? (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <div>
        <p className="field-label">Photos</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {files.map((f, i) => (
            <div key={f.url} className="group relative aspect-square overflow-hidden rounded-2xl bg-sand pop-in">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={`Selected photo ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setFiles((xs) => xs.filter((x) => x !== f))}
                className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-ink/70 text-white"
                aria-label={`Remove photo ${i + 1}`}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
          {files.length < MAX_PHOTOS ? (
            <label className="grid aspect-square cursor-pointer place-items-center rounded-2xl border border-dashed border-line-strong bg-paper text-ink-3 transition-colors hover:border-sun hover:text-sun-deep">
              <span className="flex flex-col items-center gap-1 text-xs font-medium">
                {busy ? <Spinner /> : <ImagePlus size={22} aria-hidden="true" />}
                {busy ? 'Preparing' : 'Add photos'}
              </span>
              <input ref={pickerRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" onChange={(e) => add(e.target.files)} />
            </label>
          ) : null}
        </div>
        <input ref={inputRef} type="file" name="photos" multiple className="hidden" tabIndex={-1} aria-hidden="true" />
        <p className="field-hint">Up to {MAX_PHOTOS} photos. Location data inside photos is removed before saving, and only you can see them.</p>
      </div>

      <div>
        <label className="field-label" htmlFor="m-title">
          Title
        </label>
        <input id="m-title" name="title" className="input" maxLength={120} required defaultValue={defaults.title} placeholder="Sunset swim at Clifton" aria-invalid={state.fieldErrors?.title ? true : undefined} />
        {state.fieldErrors?.title ? <p className="field-error">{state.fieldErrors.title}</p> : null}
      </div>
      <div>
        <label className="field-label" htmlFor="m-body">
          What happened?
        </label>
        <textarea id="m-body" name="body" className="textarea" maxLength={4000} placeholder="Who was there, what you ate, the song that was playing…" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="m-date">
            When
          </label>
          <input id="m-date" name="happenedOn" type="date" className="input" defaultValue={defaults.happenedOn} max={defaults.maxDate} required />
          {state.fieldErrors?.happenedOn ? <p className="field-error">{state.fieldErrors.happenedOn}</p> : null}
        </div>
        <div>
          <label className="field-label" htmlFor="m-place">
            Where <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <input id="m-place" name="placeName" className="input" maxLength={160} defaultValue={defaults.placeName} placeholder="Muizenberg beach" />
        </div>
      </div>
      <input type="hidden" name="placeId" value={defaults.placeId} />
      <input type="hidden" name="challengeId" value={defaults.challengeId} />
      <input type="hidden" name="bucketId" value={defaults.bucketId} />
      <SubmitButton className="btn btn-primary btn-lg w-full sm:w-auto" pendingText={files.length ? 'Uploading' : 'Saving'} disabled={busy}>
        Save memory
      </SubmitButton>
    </form>
  );
}
