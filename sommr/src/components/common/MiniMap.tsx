'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { MAP_STYLE_URL, warmStyle } from '@/components/explore/mapStyle';

/** A small, calm map with a single pin — for place and event pages. */
export function MiniMap({ lat, lng, color = '#b0552a', label }: { lat: number; lng: number; color?: string; label: string }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import('maplibre-gl').Map | null = null;
    let cancelled = false;
    (async () => {
      const ml = await import('maplibre-gl');
      if (cancelled || !el.current) return;
      ml.setWorkerUrl(`/vendor/maplibre-gl-worker-${ml.getVersion()}.mjs`);
      map = new ml.Map({
        container: el.current,
        style: MAP_STYLE_URL,
        center: [lng, lat],
        zoom: 15,
        interactive: true,
        cooperativeGestures: true,
        attributionControl: { compact: true },
      });
      map.on('load', () => map && warmStyle(map));
      const pin = document.createElement('div');
      pin.style.cssText = `width:22px;height:22px;border-radius:999px;background:${color};border:4px solid #fff;box-shadow:0 0 0 8px ${color}33, 0 6px 16px -6px rgba(0,0,0,.5)`;
      new ml.Marker({ element: pin }).setLngLat([lng, lat]).addTo(map);
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng, color]);
  return (
    <div className="relative h-64 overflow-hidden rounded-[22px] border border-line bg-[#f6f1e8] sm:h-80">
      <div ref={el} style={{ position: 'absolute', inset: 0 }} role="img" aria-label={`Map showing ${label}`} />
    </div>
  );
}
