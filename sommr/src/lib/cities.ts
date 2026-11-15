/**
 * South African towns and cities users can choose as home. Coordinates are city
 * centres. `events: true` marks the cities What's On covers first; everywhere else
 * still gets the map, challenges and nearby events within range.
 */
export interface City {
  slug: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
  /** Within easy reach of the sea — used to offer beach challenges. */
  coastal: boolean;
  events: boolean;
}

export const CITIES: City[] = [
  { slug: 'johannesburg', name: 'Johannesburg', province: 'Gauteng', lat: -26.2041, lng: 28.0473, coastal: false, events: true },
  { slug: 'cape-town', name: 'Cape Town', province: 'Western Cape', lat: -33.9249, lng: 18.4241, coastal: true, events: true },
  { slug: 'pretoria', name: 'Pretoria', province: 'Gauteng', lat: -25.7479, lng: 28.2293, coastal: false, events: true },
  { slug: 'durban', name: 'Durban', province: 'KwaZulu-Natal', lat: -29.8587, lng: 31.0218, coastal: true, events: true },
  { slug: 'gqeberha', name: 'Gqeberha', province: 'Eastern Cape', lat: -33.9608, lng: 25.6022, coastal: true, events: false },
  { slug: 'east-london', name: 'East London', province: 'Eastern Cape', lat: -33.0153, lng: 27.9116, coastal: true, events: false },
  { slug: 'bloemfontein', name: 'Bloemfontein', province: 'Free State', lat: -29.0852, lng: 26.1596, coastal: false, events: false },
  { slug: 'stellenbosch', name: 'Stellenbosch', province: 'Western Cape', lat: -33.9321, lng: 18.8602, coastal: true, events: false },
  { slug: 'hermanus', name: 'Hermanus', province: 'Western Cape', lat: -34.4187, lng: 19.2345, coastal: true, events: false },
  { slug: 'george', name: 'George', province: 'Western Cape', lat: -33.963, lng: 22.4617, coastal: true, events: false },
  { slug: 'knysna', name: 'Knysna', province: 'Western Cape', lat: -34.0363, lng: 23.0471, coastal: true, events: false },
  { slug: 'plettenberg-bay', name: 'Plettenberg Bay', province: 'Western Cape', lat: -34.0527, lng: 23.3716, coastal: true, events: false },
  { slug: 'mossel-bay', name: 'Mossel Bay', province: 'Western Cape', lat: -34.1831, lng: 22.146, coastal: true, events: false },
  { slug: 'jeffreys-bay', name: 'Jeffreys Bay', province: 'Eastern Cape', lat: -34.0507, lng: 24.9192, coastal: true, events: false },
  { slug: 'ballito', name: 'Ballito', province: 'KwaZulu-Natal', lat: -29.539, lng: 31.214, coastal: true, events: false },
  { slug: 'margate', name: 'Margate', province: 'KwaZulu-Natal', lat: -30.8636, lng: 30.3705, coastal: true, events: false },
  { slug: 'pietermaritzburg', name: 'Pietermaritzburg', province: 'KwaZulu-Natal', lat: -29.6006, lng: 30.3794, coastal: false, events: false },
  { slug: 'mbombela', name: 'Mbombela', province: 'Mpumalanga', lat: -25.4658, lng: 30.9853, coastal: false, events: false },
  { slug: 'polokwane', name: 'Polokwane', province: 'Limpopo', lat: -23.9045, lng: 29.4689, coastal: false, events: false },
  { slug: 'rustenburg', name: 'Rustenburg', province: 'North West', lat: -25.6676, lng: 27.2421, coastal: false, events: false },
  { slug: 'kimberley', name: 'Kimberley', province: 'Northern Cape', lat: -28.7282, lng: 24.7499, coastal: false, events: false },
];

export const EVENT_CITIES = CITIES.filter((c) => c.events);

export function getCity(slug: string | null | undefined): City | undefined {
  return slug ? CITIES.find((c) => c.slug === slug) : undefined;
}

export const DEFAULT_CITY = CITIES[1]; // Cape Town

/** Nearest listed city to a coordinate (for "use my location"). */
export function nearestCity(lat: number, lng: number): { city: City; km: number } {
  let best = CITIES[0];
  let bestKm = Infinity;
  for (const c of CITIES) {
    const km = haversineKm(lat, lng, c.lat, c.lng);
    if (km < bestKm) {
      best = c;
      bestKm = km;
    }
  }
  return { city: best, km: bestKm };
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** South Africa's rough bounding box, used to keep searches local. */
export const SA_BOUNDS: [[number, number], [number, number]] = [
  [16.3, -35.0],
  [33.0, -22.0],
];
