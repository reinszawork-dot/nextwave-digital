'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GeoJSONSource, Map as MlMap, Marker } from 'maplibre-gl';
import { CalendarDays, ChevronUp, Info, LocateFixed, Search } from 'lucide-react';
import { CategoryGlyph, type CategoryLite } from '@/components/common/CategoryGlyph';
import { distanceLabel } from '@/components/places/PlaceCard';
import { CategoryIcon } from '@/components/ui/Icon';
import { Spinner, SunLoader } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { haversineKm } from '@/lib/cities';
import type { PlaceDto } from '@/server/api';
import { LocationSearch, type GeoResult } from './LocationSearch';
import { MAP_STYLE_URL, warmStyle } from './mapStyle';
import { PlaceDetail, type PlaceDetailData } from './PlaceDetail';

export interface ExploreCategory extends CategoryLite {
  events: boolean;
}

interface EventPin {
  id: string;
  title: string;
  lat: number;
  lng: number;
  category: string;
  startsAt: string;
  venue: string | null;
}

type Selection = { kind: 'place'; id: string } | { kind: 'event'; id: string } | null;

function useIsDesktop() {
  const [desktop, setDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return desktop;
}

export function ExploreMap({
  categories,
  center,
  initialCategory,
  initialPlaceId,
}: {
  categories: ExploreCategory[];
  center: { lat: number; lng: number; zoom: number };
  initialCategory: string | null;
  initialPlaceId: string | null;
}) {
  const toast = useToast();
  const desktop = useIsDesktop();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const userMarker = useRef<Marker | null>(null);
  const fetchCtrl = useRef<AbortController | null>(null);
  const [ready, setReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>(initialCategory ? [initialCategory] : []);
  const [places, setPlaces] = useState<PlaceDto[]>([]);
  const [events, setEvents] = useState<EventPin[]>([]);
  const [loading, setLoading] = useState(false);
  const [zoomedOut, setZoomedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(initialPlaceId ? { kind: 'place', id: initialPlaceId } : null);
  const [detail, setDetail] = useState<PlaceDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(!!initialPlaceId);
  const [filter, setFilter] = useState('');
  const [viewCenter, setViewCenter] = useState({ lat: center.lat, lng: center.lng });
  const [locating, setLocating] = useState(false);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories]);
  const activeCats = selectedCats.length ? selectedCats : categories.map((c) => c.slug);
  const catKey = activeCats.join(',');

  // ── Create the map once ──
  useEffect(() => {
    let cancelled = false;
    let map: MlMap | null = null;
    (async () => {
      const ml = await import('maplibre-gl');
      if (cancelled || !mapEl.current) return;
      ml.setWorkerUrl(`/vendor/maplibre-gl-worker-${ml.getVersion()}.mjs`);
      map = new ml.Map({
        container: mapEl.current,
        style: MAP_STYLE_URL,
        center: [center.lng, center.lat],
        zoom: center.zoom,
        minZoom: 5,
        maxZoom: 18,
        maxBounds: [
          [10, -40],
          [40, -15],
        ],
        attributionControl: { compact: true },
        cooperativeGestures: false,
      });
      mapRef.current = map;
      map.addControl(new ml.NavigationControl({ showCompass: false }), 'bottom-right');
      map.on('error', (e) => {
        if (!map?.isStyleLoaded() && /style|Failed to fetch/i.test(String(e.error?.message))) setMapFailed(true);
      });
      map.on('load', () => {
        if (!map) return;
        warmStyle(map);
        map.addSource('places', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterRadius: 42, clusterMaxZoom: 14 });
        map.addSource('events', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'places',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#1f1c18',
            'circle-radius': ['step', ['get', 'point_count'], 15, 10, 19, 40, 24],
            'circle-stroke-width': 3,
            'circle-stroke-color': '#faf6ef',
          },
        });
        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'places',
          filter: ['has', 'point_count'],
          layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 12 },
          paint: { 'text-color': '#faf6ef' },
        });
        map.addLayer({
          id: 'selected-halo',
          type: 'circle',
          source: 'places',
          filter: ['==', ['get', 'id'], ''],
          paint: { 'circle-radius': 20, 'circle-color': '#d9733b', 'circle-opacity': 0.22 },
        });
        map.addLayer({
          id: 'points',
          type: 'circle',
          source: 'places',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 15, 8, 18, 10],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });
        map.addLayer({
          id: 'points-label',
          type: 'symbol',
          source: 'places',
          minzoom: 14.5,
          filter: ['!', ['has', 'point_count']],
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Noto Sans Regular'],
            'text-size': 11.5,
            'text-offset': [0, 1.1],
            'text-anchor': 'top',
            'text-max-width': 9,
            'text-optional': true,
          },
          paint: { 'text-color': '#48423a', 'text-halo-color': '#fbf7f0', 'text-halo-width': 1.6 },
        });
        map.addLayer({
          id: 'events-points',
          type: 'circle',
          source: 'events',
          paint: {
            'circle-color': '#ffffff',
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 15, 9],
            'circle-stroke-width': 3.5,
            'circle-stroke-color': '#95577f',
          },
        });
        const pointer = () => map && (map.getCanvas().style.cursor = 'pointer');
        const unpointer = () => map && (map.getCanvas().style.cursor = '');
        for (const layer of ['points', 'clusters', 'events-points']) {
          map.on('mouseenter', layer, pointer);
          map.on('mouseleave', layer, unpointer);
        }
        map.on('click', 'clusters', async (e) => {
          const f = e.features?.[0];
          if (!f || !map) return;
          const src = map.getSource('places') as GeoJSONSource;
          const zoom = await src.getClusterExpansionZoom(f.properties.cluster_id as number);
          map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: zoom + 0.3, duration: 600 });
        });
        map.on('click', 'points', (e) => {
          const id = e.features?.[0]?.properties?.id as string | undefined;
          if (id) {
            setSelection({ kind: 'place', id });
            setSheetOpen(true);
          }
        });
        map.on('click', 'events-points', (e) => {
          const id = e.features?.[0]?.properties?.id as string | undefined;
          if (id) {
            setSelection({ kind: 'event', id });
            setSheetOpen(true);
          }
        });
        setReady(true);
      });
    })().catch(() => setMapFailed(true));
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
    // The map is created once; later centre changes use flyTo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load places for the visible area ──
  const load = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    const c = map.getCenter();
    setViewCenter({ lat: c.lat, lng: c.lng });
    fetchCtrl.current?.abort();
    const ctrl = new AbortController();
    fetchCtrl.current = ctrl;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((n) => n.toFixed(5)).join(','),
        categories: catKey,
      });
      const r = await fetch(`/api/places?${params}`, { signal: ctrl.signal });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Couldn’t load places.');
      setPlaces(d.places);
      setEvents(d.events);
      setZoomedOut(d.zoomedOut);
      setError(d.error);
    } catch (err) {
      if (!ctrl.signal.aborted) setError((err as Error).message);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [catKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    let t: ReturnType<typeof setTimeout>;
    const onMove = () => {
      clearTimeout(t);
      t = setTimeout(load, 380);
    };
    load();
    map.on('moveend', onMove);
    return () => {
      clearTimeout(t);
      map.off('moveend', onMove);
    };
  }, [ready, load]);

  // ── Push data into the map ──
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource('places') as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: places.map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { id: p.id, name: p.name, color: catMap.get(p.category)?.color ?? '#7c756b' },
      })),
    });
    (map.getSource('events') as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: events.map((e) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [e.lng, e.lat] },
        properties: { id: e.id, name: e.title },
      })),
    });
  }, [ready, places, events, catMap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setFilter('selected-halo', ['==', ['get', 'id'], selection?.kind === 'place' ? selection.id : '']);
  }, [ready, selection]);

  // ── Selected place details ──
  useEffect(() => {
    if (selection?.kind !== 'place') {
      setDetail(null);
      return;
    }
    const ctrl = new AbortController();
    setDetailLoading(true);
    fetch(`/api/places/${selection.id}`, { signal: ctrl.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setDetail(d);
        const map = mapRef.current;
        if (map) {
          const inView = map.getBounds().contains([d.lng, d.lat]);
          if (!inView || map.getZoom() < 14) map.easeTo({ center: [d.lng, d.lat], zoom: Math.max(map.getZoom(), 15), duration: 700 });
        }
      })
      .catch((err) => {
        if (!ctrl.signal.aborted) {
          toast((err as Error).message || 'Couldn’t open that place.', { tone: 'error' });
          setSelection(null);
        }
      })
      .finally(() => !ctrl.signal.aborted && setDetailLoading(false));
    return () => ctrl.abort();
  }, [selection, toast]);

  const flyTo = (r: GeoResult) => {
    const map = mapRef.current;
    if (!map) return;
    setSelection(null);
    if (r.bbox && r.type !== 'city') {
      const [s, n, w, e] = r.bbox;
      map.fitBounds(
        [
          [w, s],
          [e, n],
        ],
        { padding: 60, maxZoom: 15, duration: 900 },
      );
    } else map.flyTo({ center: [r.lng, r.lat], zoom: r.type === 'city' ? 12.5 : 14, duration: 1100 });
  };

  const nearMe = () => {
    if (!('geolocation' in navigator)) return toast('Your browser can’t share its location.', { tone: 'error' });
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        const map = mapRef.current;
        if (!map) return;
        const ml = await import('maplibre-gl');
        const el = document.createElement('div');
        el.className = 'h-4 w-4 rounded-full border-[3px] border-white bg-sea-deep shadow-[0_0_0_6px_rgba(61,108,147,0.25)]';
        el.setAttribute('aria-label', 'You are here');
        userMarker.current?.remove();
        userMarker.current = new ml.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
        map.flyTo({ center: [lng, lat], zoom: 14.5, duration: 1100 });
      },
      (err) => {
        setLocating(false);
        toast(err.code === err.PERMISSION_DENIED ? 'Location permission was declined.' : 'Couldn’t get your location.', { tone: 'error' });
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  const toggleCat = (slug: string | null) => {
    setSelection(null);
    if (!slug) return setSelectedCats([]);
    setSelectedCats((xs) => (xs.includes(slug) ? xs.filter((x) => x !== slug) : [...xs, slug]));
  };

  const listed = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return places
      .filter((p) => !f || p.name.toLowerCase().includes(f))
      .map((p) => ({ ...p, distanceKm: haversineKm(viewCenter.lat, viewCenter.lng, p.lat, p.lng) }))
      .sort((a, b) => Number(b.featured) - Number(a.featured) || a.distanceKm - b.distanceKm)
      .slice(0, 150);
  }, [places, filter, viewCenter]);

  const selectedEvent = selection?.kind === 'event' ? events.find((e) => e.id === selection.id) : null;

  const chips = (
    <div className={desktop ? 'flex flex-wrap gap-2 py-1' : 'scroller !gap-2 py-1'} role="group" aria-label="Filter by category">
      <button type="button" className="chip" aria-pressed={selectedCats.length === 0} onClick={() => toggleCat(null)}>
        All
      </button>
      {categories.map((c) => (
        <button key={c.slug} type="button" className="chip" aria-pressed={selectedCats.includes(c.slug)} onClick={() => toggleCat(c.slug)}>
          <CategoryIcon name={c.icon} size={15} />
          {c.label}
        </button>
      ))}
    </div>
  );

  const status = zoomedOut
    ? 'Zoom in to discover more places'
    : loading
      ? 'Finding places…'
      : error
        ? error
        : `${places.length} place${places.length === 1 ? '' : 's'}${events.length ? ` · ${events.length} event${events.length === 1 ? '' : 's'}` : ''} in view`;

  const panel = (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8">
      {selection?.kind === 'place' ? (
        detailLoading || !detail ? (
          <SunLoader label="Opening place" />
        ) : (
          <PlaceDetail
            key={detail.id}
            place={detail}
            category={catMap.get(detail.category)}
            onBack={() => setSelection(null)}
            onChange={(patch) => setPlaces((ps) => ps.map((p) => (p.id === detail.id ? { ...p, ...patch } : p)))}
          />
        )
      ) : selectedEvent ? (
        <div className="fade-in">
          <button type="button" onClick={() => setSelection(null)} className="mb-4 text-sm font-medium text-ink-3 hover:text-ink">
            ← All places
          </button>
          <span className="tag tag-sun">
            <CalendarDays size={13} aria-hidden="true" /> Event
          </span>
          <h2 className="display mt-3 text-[2rem]">{selectedEvent.title}</h2>
          <p className="mt-1 text-sm text-ink-3">
            {new Date(selectedEvent.startsAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            {selectedEvent.venue ? ` · ${selectedEvent.venue}` : ''}
          </p>
          <Link href={`/events/${selectedEvent.id}`} className="btn btn-primary mt-5 w-full">
            View event
          </Link>
        </div>
      ) : (
        <>
          <div className="relative mb-3">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter places in view"
              aria-label="Filter places in view by name"
              className="input !h-10 !rounded-full !pl-10 text-sm"
            />
          </div>
          {listed.length === 0 && !loading ? (
            <div className="py-10 text-center text-sm text-ink-3">
              {zoomedOut ? 'Zoom in on the map to see places.' : error ? 'Places couldn’t load right now. Move the map to try again.' : 'Nothing here for these categories. Try another area or category.'}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {listed.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelection({ kind: 'place', id: p.id })}
                    className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-sand/60"
                  >
                    <CategoryGlyph category={catMap.get(p.category)} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="block truncate text-xs text-ink-3">
                        {[catMap.get(p.category)?.label, p.suburb].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-ink-3">
                      {distanceLabel(p.distanceKm)}
                      {p.visited ? <span className="mt-0.5 block text-leaf">Visited</span> : p.saved ? <span className="mt-0.5 block text-sun-deep">Saved</span> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 text-xs text-ink-3">
            Missing somewhere?{' '}
            <Link href="/submit/place" className="underline">
              Suggest a place
            </Link>{' '}
            · Places © OpenStreetMap contributors · Map tiles by OpenFreeMap
          </p>
        </>
      )}
    </div>
  );

  return (
    <div id="main" className="fixed inset-x-0 bottom-[var(--bottom-nav-h)] top-14 flex lg:inset-y-0 lg:left-[var(--sidebar-w)] lg:right-0">
      {desktop ? (
        <aside className="relative z-10 flex w-[400px] shrink-0 flex-col border-r border-line bg-cream" aria-label="Places">
          <div className="space-y-3 px-5 pb-3 pt-7">
            <h1 className="display text-5xl">Explore</h1>
            <LocationSearch onPick={flyTo} />
            {chips}
            <p className="flex items-center gap-2 text-xs text-ink-3" role="status" aria-live="polite">
              {loading ? <Spinner size={13} /> : null}
              {status}
            </p>
          </div>
          {panel}
        </aside>
      ) : null}

      <div className="relative min-w-0 flex-1">
        {/* Inline position: MapLibre's own CSS would otherwise override it with position: relative. */}
        <div ref={mapEl} style={{ position: 'absolute', inset: 0 }} className="bg-[#f6f1e8]" role="region" aria-label="Map of places" />
        {mapFailed ? (
          <div className="absolute inset-0 grid place-items-center bg-cream/90 p-6 text-center">
            <div className="max-w-sm">
              <Info className="mx-auto text-sun-deep" aria-hidden="true" />
              <p className="mt-3 font-semibold">The map couldn’t load</p>
              <p className="mt-1 text-sm text-ink-3">Check your connection and refresh. You can still browse the list of places.</p>
            </div>
          </div>
        ) : null}

        {desktop === false ? (
          <div className="absolute inset-x-0 top-0 z-10 space-y-2 bg-gradient-to-b from-cream via-cream/80 to-transparent px-3 pb-6 pt-3">
            <LocationSearch onPick={flyTo} />
            {chips}
          </div>
        ) : null}

        {loading || zoomedOut ? (
          <div className="pointer-events-none absolute left-1/2 top-[136px] z-10 -translate-x-1/2 lg:top-5">
            <span className="flex items-center gap-2 rounded-full bg-ink/90 px-4 py-2 text-xs font-medium text-cream shadow-[var(--shadow-float)] fade-in">
              {loading ? <Spinner size={13} /> : null}
              {status}
            </span>
          </div>
        ) : null}

        <button
          type="button"
          onClick={nearMe}
          disabled={locating}
          className="absolute bottom-[132px] right-3 z-10 grid h-11 w-11 place-items-center rounded-full border border-line bg-paper shadow-[var(--shadow-card)] transition-transform active:scale-95 lg:bottom-28 lg:right-[10px]"
          aria-label="Show places near me"
        >
          {locating ? <Spinner /> : <LocateFixed size={19} className="text-sea-deep" aria-hidden="true" />}
        </button>
      </div>

      {desktop === false ? (
        <section
          className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[26px] border-t border-line bg-cream shadow-[0_-12px_40px_-20px_rgba(31,28,24,0.35)] transition-[height] duration-500 ease-[var(--ease-soft)]"
          style={{ height: sheetOpen ? '62%' : '116px' }}
          aria-label="Places list"
        >
          <button
            type="button"
            onClick={() => setSheetOpen((o) => !o)}
            className="flex w-full flex-col items-center px-5 pb-3 pt-2.5"
            aria-expanded={sheetOpen}
          >
            <span className="h-1.5 w-10 rounded-full bg-line-strong" aria-hidden="true" />
            <span className="mt-3 flex w-full items-center justify-between">
              <span className="text-left">
                <span className="block font-semibold">
                  {selection ? (selection.kind === 'place' ? detail?.name ?? 'Place' : selectedEvent?.title ?? 'Event') : 'Places in view'}
                </span>
                <span className="block text-xs text-ink-3" role="status" aria-live="polite">
                  {status}
                </span>
              </span>
              <ChevronUp size={20} className={`text-ink-3 transition-transform duration-300 ${sheetOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </span>
          </button>
          {sheetOpen ? panel : null}
        </section>
      ) : null}
    </div>
  );
}
