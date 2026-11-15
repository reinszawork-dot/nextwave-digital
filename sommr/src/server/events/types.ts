/** One event as normalised from any provider, before it is stored. */
export interface ImportedEvent {
  sourceId: string;
  title: string;
  description?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  allDay?: boolean;
  venueName?: string | null;
  address?: string | null;
  /** Free-text city/locality from the provider, used if there are no coordinates. */
  cityHint?: string | null;
  lat?: number | null;
  lng?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  currency?: string | null;
  isFree?: boolean | null;
  ticketUrl?: string | null;
  sourceUrl?: string | null;
  imageUrl?: string | null;
  organiser?: string | null;
  /** Provider genres / categories, used to classify into SOMMR categories. */
  categoryHints: string[];
  cancelled?: boolean;
}

export interface ProviderResult {
  events: ImportedEvent[];
  /** True when the result is the source's full list of upcoming events (so missing ones were removed). */
  complete: boolean;
  /** Extra detail for the admin log. */
  note?: string;
}

export class NeedsCredentialsError extends Error {
  constructor(public envVar: string) {
    super(`Add ${envVar} to the server environment to enable this source.`);
  }
}
