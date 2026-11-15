/** Make OpenStreetMap opening_hours strings readable: "Mo-Fr 08:00-17:00; Sa 09:00-13:00" → lines. */
const DAYS: Record<string, string> = { Mo: 'Mon', Tu: 'Tue', We: 'Wed', Th: 'Thu', Fr: 'Fri', Sa: 'Sat', Su: 'Sun', PH: 'Public holidays' };

export function prettyOpeningHours(raw: string | null | undefined): string[] {
  if (!raw) return [];
  if (raw.trim() === '24/7') return ['Open 24 hours'];
  return raw
    .split(';')
    .map((part) =>
      part
        .trim()
        .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (d) => DAYS[d])
        .replace(/\boff\b/gi, 'closed')
        .replace(/-/g, '–')
        .replace(/,(?=\S)/g, ', '),
    )
    .filter(Boolean)
    .slice(0, 8);
}
