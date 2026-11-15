/** Build a single-event iCalendar file (RFC 5545) for "Add to calendar". */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const dateOnly = (d: Date) => {
  const sa = new Date(d.getTime() + 2 * 3_600_000);
  return sa.toISOString().slice(0, 10).replace(/-/g, '');
};

function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ' ' + rest.slice(74);
  }
  out.push(rest);
  return out.join('\r\n');
}

export function buildIcs(e: {
  id: string;
  title: string;
  description?: string | null;
  start: Date;
  end?: Date | null;
  allDay?: boolean;
  location?: string | null;
  url?: string | null;
}): string {
  const end = e.end ?? new Date(e.start.getTime() + (e.allDay ? 86_400_000 : 2 * 3_600_000));
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SOMMR//Whats On//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.id}@sommr`,
    `DTSTAMP:${stamp(new Date())}`,
    e.allDay ? `DTSTART;VALUE=DATE:${dateOnly(e.start)}` : `DTSTART:${stamp(e.start)}`,
    e.allDay ? `DTEND;VALUE=DATE:${dateOnly(new Date(end.getTime() + 86_400_000))}` : `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(e.title)}`,
    e.location ? `LOCATION:${esc(e.location)}` : null,
    e.description ? `DESCRIPTION:${esc(e.description.slice(0, 1500))}` : null,
    e.url ? `URL:${e.url}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean) as string[];
  return lines.map(fold).join('\r\n') + '\r\n';
}
