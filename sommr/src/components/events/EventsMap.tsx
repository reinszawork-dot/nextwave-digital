'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { GeoJSONSource } from 'maplibre-gl';
import { X } from 'lucide-react';
import { MAP_STYLE_URL, warmStyle } from '@/components/explore/mapStyle';

export interface EventPinData {
  id: string;
  title: string;
  lat: number;
  lng: number;
  color: string;
  when: string;
  venue: string | null;
}

/** All mappable events for the current filters; tap a pin for a summary. */
export function EventsMap({ events, center }: { events: EventPinData[]; center: { lat: number; lng: number } }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<EventPinData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ml = await import('maplibre-gl');
      if (cancelled || !el.current) return;
      ml.setWorkerUrl(`/vendor/maplibre-gl-worker-${ml.getVersion()}.mjs`);
      const map = new ml.Map({ container: el.current, style: MAP_STYLE_URL, center: [center.lng, center.lat], zoom: 11, attributionControl: { compact: true } });
      mapRef.current = map;
      map.addControl(new ml.NavigationControl({ showCompass: false }), 'bottom-right');
      map.on('load', () => {
        warmStyle(map);
        map.addSource('events', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({
          id: 'events',
          type: 'circle',
          source: 'events',
          paint: { 'circle-color': ['get', 'color'], 'circle-radius': 8, 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 },
        });
        map.on('mouseenter', 'events', () => (map.getCanvas().style.cursor = 'pointer'));
        map.on('mouseleave', 'events', () => (map.getCanvas().style.cursor = ''));
        setReady(true);
      });
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource('events') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: events.map((e) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [e.lng, e.lat] }, properties: { id: e.id, color: e.color } })),
    });
    const onClick = (ev: import('maplibre-gl').MapLayerMouseEvent) => {
      const id = ev.features?.[0]?.properties?.id;
      setSelected(events.find((e) => e.id === id) ?? null);
    };
    map.on('click', 'events', onClick);
    if (events.length > 1) {
      const lats = events.map((e) => e.lat);
      const lngs = events.map((e) => e.lng);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 70, maxZoom: 14, duration: 0 },
      );
    } else if (events.length === 1) map.jumpTo({ center: [events[0].lng, events[0].lat], zoom: 14 });
    return () => {
      map.off('click', 'events', onClick);
    };
  }, [ready, events]);

  return (
    <div className="relative h-[62vh] min-h-[420px] overflow-hidden rounded-[22px] border border-line bg-[#f6f1e8]">
      <div ref={el} style={{ position: 'absolute', inset: 0 }} role="region" aria-label="Map of events" />
      {selected ? (
        <div className="absolute inset-x-3 bottom-3 z-10 rounded-2xl border border-line bg-paper p-4 shadow-[var(--shadow-float)] sm:left-auto sm:right-3 sm:w-80 fade-in">
          <button type="button" onClick={() => setSelected(null)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-sand" aria-label="Close">
            <X size={16} aria-hidden="true" />
          </button>
          <p className="text-xs font-semibold text-sun-deep">{selected.when}</p>
          <p className="mt-1 pr-6 font-semibold leading-snug">{selected.title}</p>
          {selected.venue ? <p className="mt-0.5 text-sm text-ink-3">{selected.venue}</p> : null}
          <Link href={`/events/${selected.id}`} className="btn btn-primary btn-sm mt-3 w-full">
            View event
          </Link>
        </div>
      ) : null}
      {events.length === 0 ? (
        <p className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-ink/90 px-4 py-2 text-xs text-cream">No events with a mapped venue for these filters</p>
      ) : null}
    </div>
  );
}
