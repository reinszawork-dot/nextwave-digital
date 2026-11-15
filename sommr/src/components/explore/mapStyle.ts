import type { Map as MlMap } from 'maplibre-gl';

/** Free, keyless vector tiles from OpenFreeMap (OpenStreetMap data). */
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

/** Warm the neutral Positron style into SOMMR's cream, sand and soft blue. */
const PAINT: Record<string, Record<string, unknown>> = {
  background: { 'background-color': '#f6f1e8' },
  park: { 'fill-color': '#e2e9d4' },
  water: { 'fill-color': '#c8dbeb' },
  landcover_wood: { 'fill-color': '#dde5cf' },
  landuse_residential: { 'fill-color': '#f0e9dd' },
  building: { 'fill-color': '#e9e0d1' },
  waterway: { 'line-color': '#c8dbeb' },
  highway_minor: { 'line-color': '#ffffff' },
  highway_path: { 'line-color': '#ffffff' },
  highway_major_casing: { 'line-color': '#e2d7c5' },
  highway_major_inner: { 'line-color': '#ffffff' },
  highway_motorway_casing: { 'line-color': '#e2d7c5' },
  road_area_pier: { 'fill-color': '#f6f1e8' },
  road_pier: { 'line-color': '#f6f1e8' },
};

export function warmStyle(map: MlMap) {
  for (const layer of map.getStyle().layers ?? []) {
    const paint = PAINT[layer.id];
    if (paint) {
      for (const [k, v] of Object.entries(paint)) {
        try {
          map.setPaintProperty(layer.id, k as never, v as never);
        } catch {
          /* layer property not present in this style version */
        }
      }
    }
    if (layer.type === 'symbol') {
      try {
        const isWater = layer.id.startsWith('water');
        map.setPaintProperty(layer.id, 'text-color', isWater ? '#3d6c93' : layer.id.startsWith('label_') ? '#3b352e' : '#7a7266');
        map.setPaintProperty(layer.id, 'text-halo-color', '#f6f1e8');
      } catch {
        /* symbol layers without text */
      }
    }
  }
}

export function directionsLinks(lat: number, lng: number) {
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
    apple: `https://maps.apple.com/?daddr=${lat},${lng}`,
  };
}
