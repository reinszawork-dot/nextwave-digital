/**
 * Parser tests. Fixtures are SYNTHETIC — shaped like each provider's documented
 * response format, with made-up values. They are test data only, never shown in the app.
 */
import { describe, expect, it } from 'vitest';
import { geohash, mapTicketmasterEvent } from '@/server/events/providers/ticketmaster';
import { htmlToText, mapQuicketEvent } from '@/server/events/providers/quicket';
import { parseIcal, zonedTimeToUtc } from '@/server/events/providers/ical';
import { parseJsonLdEvents } from '@/server/events/providers/jsonld';
import { classifyEvent } from '@/server/events/classify';
import { assignCity, isExpired } from '@/server/events/importer';
import { CATEGORY_SEED } from '@/server/seed-data';
import { buildIcs } from '@/lib/ics';

const eventCategories = CATEGORY_SEED.filter((c) => c.kind === 'event').map((c) => ({ slug: c.slug, keywords: c.keywords ?? [] }));

describe('Ticketmaster Discovery mapping', () => {
  it('maps a v2 event with venue, price, image and classification', () => {
    const e = mapTicketmasterEvent({
      id: 'TEST123',
      name: 'Test Concert',
      url: 'https://example.com/tm/test',
      info: 'Doors open at 18:00',
      dates: { start: { localDate: '2026-12-12', localTime: '19:30:00', dateTime: '2026-12-12T17:30:00Z' }, status: { code: 'onsale' } },
      images: [
        { url: 'https://example.com/small.jpg', ratio: '3_2', width: 305 },
        { url: 'https://example.com/wide.jpg', ratio: '16_9', width: 1024 },
        { url: 'https://example.com/huge.jpg', ratio: '16_9', width: 2048 },
      ],
      classifications: [{ segment: { name: 'Music' }, genre: { name: 'Jazz' }, subGenre: { name: 'Undefined' } }],
      priceRanges: [{ min: 250, max: 650, currency: 'ZAR' }],
      _embedded: { venues: [{ name: 'Test Arena', address: { line1: '1 Test Rd' }, city: { name: 'Cape Town' }, location: { latitude: '-33.9', longitude: '18.4' } }] },
    })!;
    expect(e.startsAt.toISOString()).toBe('2026-12-12T17:30:00.000Z');
    expect(e).toMatchObject({ sourceId: 'TEST123', venueName: 'Test Arena', lat: -33.9, lng: 18.4, priceMin: 250, priceMax: 650, imageUrl: 'https://example.com/wide.jpg', cancelled: false });
    expect(e.categoryHints).toEqual(['Music', 'Jazz']);
  });
  it('flags cancelled events and skips undated ones', () => {
    expect(mapTicketmasterEvent({ id: 'x', name: 'x', dates: { start: { localDate: '2026-12-01' }, status: { code: 'cancelled' } } })!.cancelled).toBe(true);
    expect(mapTicketmasterEvent({ id: 'y', name: 'y', dates: { start: { dateTBD: true } } })).toBeNull();
  });
  it('encodes geohashes', () => {
    expect(geohash(57.64911, 10.40744, 11)).toBe('u4pruydqqvj'); // reference value from the geohash spec
  });
});

describe('Quicket mapping', () => {
  it('maps the documented event shape', () => {
    const e = mapQuicketEvent({
      id: 999001,
      name: ' Test Night Market ',
      description: '<p>Food &amp; music</p><ul><li>Stalls</li></ul>',
      url: 'https://example.com/quicket/test',
      imageUrl: 'https://example.com/q.jpg',
      startDate: '2026-12-05T17:00:00',
      endDate: '2026-12-05T22:00:00',
      venue: { name: 'Test Park', addressLine1: '2 Test St', latitude: -26.1, longitude: 28.05 },
      locality: { levelOne: 'Gauteng', levelTwo: 'Johannesburg', levelThree: 'Rosebank' },
      organiser: { name: 'Test Org' },
      categories: [{ id: 1, name: 'Food & Drink' }],
      tickets: [{ price: 0 }, { price: 80 }, { price: 50, donation: true }],
    })!;
    expect(e.title).toBe('Test Night Market');
    expect(e.startsAt.toISOString()).toBe('2026-12-05T15:00:00.000Z');
    expect(e).toMatchObject({ priceMin: 0, priceMax: 80, isFree: false, lat: -26.1, lng: 28.05, cityHint: 'Johannesburg', organiser: 'Test Org' });
    expect(e.description).toBe('Food & music\n• Stalls');
  });
  it('ignores 0,0 coordinates and strips HTML safely', () => {
    expect(mapQuicketEvent({ id: 1, name: 'x', startDate: '2026-12-05T10:00:00', venue: { latitude: 0, longitude: 0 } })!.lat).toBeNull();
    expect(htmlToText('<script>alert(1)</script>Hi')).toBe('alert(1)Hi');
  });
});

describe('iCalendar parsing', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    'UID:test-1@example.com',
    'SUMMARY:Test Carols by Candlelight',
    'DTSTART;TZID=Africa/Johannesburg:20261220T190000',
    'DTEND;TZID=Africa/Johannesburg:20261220T210000',
    'LOCATION:Test Gardens\\, Main Rd\\, Cape Town',
    'DESCRIPTION:Bring a blanket.\\nCandles provided. This line is long enough that it will be fold',
    ' ed by the feed.',
    'GEO:-33.98;18.43',
    'URL:https://example.com/carols',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'UID:test-2@example.com',
    'SUMMARY:Test Market Day',
    'DTSTART;VALUE=DATE:20261212',
    'DTEND;VALUE=DATE:20261213',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'UID:test-3@example.com',
    'SUMMARY:Test Cancelled Thing',
    'DTSTART:20261201T100000Z',
    'STATUS:CANCELLED',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'UID:test-4@example.com',
    'SUMMARY:Test London Stream',
    'DTSTART;TZID=Europe/London:20261201T120000',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const events = parseIcal(ics);
  it('parses timed, all-day, cancelled and foreign-zone events', () => {
    expect(events).toHaveLength(4);
    expect(events[0].startsAt.toISOString()).toBe('2026-12-20T17:00:00.000Z');
    expect(events[0]).toMatchObject({ venueName: 'Test Gardens', address: 'Test Gardens, Main Rd, Cape Town', lat: -33.98, lng: 18.43 });
    expect(events[0].description).toContain('will be folded by the feed.');
    expect(events[1].allDay).toBe(true);
    expect(events[1].startsAt.toISOString()).toBe('2026-12-11T22:00:00.000Z');
    expect(events[1].endsAt!.toISOString()).toBe('2026-12-12T21:59:00.000Z');
    expect(events[2].cancelled).toBe(true);
    expect(events[3].startsAt.toISOString()).toBe('2026-12-01T12:00:00.000Z');
  });
  it('converts zoned wall-clock times', () => {
    expect(zonedTimeToUtc(2026, 7, 1, 12, 0, 0, 'Europe/London').toISOString()).toBe('2026-07-01T11:00:00.000Z');
  });
});

describe('schema.org JSON-LD parsing', () => {
  const html = `<html><head>
    <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage"},{"@type":"MusicEvent","@id":"https://example.com/e/1","name":"Test Gig","startDate":"2026-12-19T20:00:00+02:00","endDate":"2026-12-19T23:00:00+02:00","location":{"@type":"Place","name":"Test Club","address":{"@type":"PostalAddress","streetAddress":"3 Test Ave","addressLocality":"Durban"},"geo":{"latitude":"-29.85","longitude":"31.02"}},"offers":[{"price":"120","priceCurrency":"ZAR","url":"/tickets/1"}],"image":["https://example.com/i.jpg"],"organizer":{"name":"Test Promoter"}}]}</script>
    <script type="application/ld+json">{"@type":"ItemList","itemListElement":[{"@type":"ListItem","item":{"@type":"Festival","name":"Test Fest","startDate":"2026-12-28","url":"https://example.com/fest","eventStatus":"https://schema.org/EventCancelled","location":"Test Farm, Stellenbosch","isAccessibleForFree":true}}]}</script>
    <script type="application/ld+json">{ not valid json </script>
  </head></html>`;
  const events = parseJsonLdEvents(html, 'https://example.com/whats-on');
  it('finds events in @graph and ItemList, skipping invalid blocks', () => {
    expect(events.map((e) => e.title)).toEqual(['Test Gig', 'Test Fest']);
    expect(events[0]).toMatchObject({ sourceId: 'https://example.com/e/1', venueName: 'Test Club', cityHint: 'Durban', lat: -29.85, lng: 31.02, priceMin: 120, ticketUrl: 'https://example.com/tickets/1', organiser: 'Test Promoter' });
    expect(events[0].startsAt.toISOString()).toBe('2026-12-19T18:00:00.000Z');
    expect(events[1]).toMatchObject({ cancelled: true, allDay: true, isFree: true, address: 'Test Farm, Stellenbosch' });
  });
});

describe('classification and cities', () => {
  const c = (title: string, hints: string[] = [], description = '') => classifyEvent({ title, hints, description }, eventCategories);
  it('classifies events sensibly', () => {
    expect(c('Christmas Craft Market at the Park')).toBe('christmas-market');
    expect(c('Summer Jazz Festival 2026')).toBe('festival');
    expect(c('Amapiano Sundays with Test DJ')).toBe('djs');
    expect(c('Stand-up comedy night')).toBe('live');
    expect(c('Test vs Test', ['Sports', 'Cricket'])).toBe('sport');
    expect(c('An evening with Someone', ['Music', 'Rock'])).toBe('music');
    expect(c('Saturday night market')).toBe('food-market');
    expect(c('Rooftop pool party')).toBe('party');
    expect(c('Something unusual')).toBe('other');
  });
  it('assigns events to the nearest launch city', () => {
    expect(assignCity({ lat: -33.93, lng: 18.86 }, null)).toBe('cape-town'); // Stellenbosch is within Cape Town's radius
    expect(assignCity({ lat: -25.75, lng: 28.19 }, null)).toBe('pretoria');
    expect(assignCity({ lat: -34.42, lng: 19.23 }, null)).toBe('hermanus');
    expect(assignCity({ cityHint: 'Sandton', address: null }, null)).toBe('johannesburg');
    expect(assignCity({ lat: -22.5, lng: 17.0 }, null)).toBeNull();
  });
  it('knows when an event has finished', () => {
    const now = new Date('2026-12-10T12:00:00Z');
    expect(isExpired({ startsAt: new Date('2026-12-10T08:00:00Z') }, now)).toBe(false); // within 6 h default
    expect(isExpired({ startsAt: new Date('2026-12-10T05:00:00Z') }, now)).toBe(true);
    expect(isExpired({ startsAt: new Date('2026-12-09T08:00:00Z'), endsAt: new Date('2026-12-11T08:00:00Z') }, now)).toBe(false);
  });
});

describe('calendar export', () => {
  it('builds a valid single-event .ics', () => {
    const ics = buildIcs({ id: 'abc', title: 'Test; event, with chars', start: new Date('2026-12-12T17:30:00Z'), location: 'Test Arena, Cape Town', description: 'Line 1\nLine 2' });
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART:20261212T173000Z');
    expect(ics).toContain('DTEND:20261212T193000Z');
    expect(ics).toContain(String.raw`SUMMARY:Test\; event\, with chars`);
    expect(ics).toContain('DESCRIPTION:Line 1\\nLine 2');
    expect(ics.split('\r\n').every((l) => l.length <= 75)).toBe(true);
  });
});
