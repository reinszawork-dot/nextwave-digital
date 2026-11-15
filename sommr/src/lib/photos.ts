/**
 * Bundled summer photography, served from /public/photos. All images are from
 * Unsplash (https://unsplash.com) under the Unsplash License, which allows free
 * commercial use. `place` is set only where the photo verifiably shows that place.
 */
export const PHOTOS = {
  'camps-bay': { src: '/photos/camps-bay.jpg', alt: 'Camps Bay and the Twelve Apostles at golden hour', place: 'Camps Bay, Cape Town', w: 1600, h: 1067, unsplash: '1576485290814-1c72aa4bbb8e' },
  'cape-town': { src: '/photos/cape-town.jpg', alt: 'Cape Town from the air with Table Mountain and Lion’s Head', place: 'Cape Town', w: 1600, h: 1067, unsplash: '1580060839134-75a5edca2e99' },
  johannesburg: { src: '/photos/johannesburg.jpg', alt: 'The Johannesburg skyline with the Hillbrow Tower', place: 'Johannesburg', w: 1600, h: 1200, unsplash: '1577948000111-9c970dfe3743' },
  'blyde-canyon': { src: '/photos/blyde-canyon.jpg', alt: 'Blyde River Canyon and the Three Rondavels', place: 'Blyde River Canyon, Mpumalanga', w: 1600, h: 1067, unsplash: '1484318571209-661cf29a69c3' },
  'beach-sunset': { src: '/photos/beach-sunset.jpg', alt: 'Soft waves rolling onto a beach at sunset', place: null, w: 1600, h: 1064, unsplash: '1507525428034-b723cf961d3e' },
  'acacia-sunset': { src: '/photos/acacia-sunset.jpg', alt: 'A lone acacia tree against a warm sunset sky', place: null, w: 1600, h: 1203, unsplash: '1516026672322-bc52d61a55d5' },
  braai: { src: '/photos/braai.jpg', alt: 'A platter of flame-grilled meat and vegetables', place: null, w: 1100, h: 1650, unsplash: '1555939594-58d7cb561ad1' },
  coffee: { src: '/photos/coffee.jpg', alt: 'Friends clinking cups of coffee', place: null, w: 1600, h: 1067, unsplash: '1495474472287-4d71bcdd2085' },
  market: { src: '/photos/market.jpg', alt: 'Market stalls under striped awnings', place: null, w: 1600, h: 1068, unsplash: '1533900298318-6b8da08a523e' },
  concert: { src: '/photos/concert.jpg', alt: 'A crowd with hands raised at a concert', place: null, w: 1600, h: 1067, unsplash: '1459749411175-04bf5292ceea' },
  festival: { src: '/photos/festival.jpg', alt: 'Confetti falling over a festival crowd', place: null, w: 1600, h: 1068, unsplash: '1533174072545-7a4b6ad7a6c3' },
  camping: { src: '/photos/camping.jpg', alt: 'The view from inside a tent towards the forest', place: null, w: 1600, h: 1068, unsplash: '1504280390367-361c6d9f38f4' },
  unwind: { src: '/photos/unwind.jpg', alt: 'A person sitting peacefully in warm evening light', place: null, w: 1100, h: 1279, unsplash: '1506126613408-eca07ce68773' },
  'party-lights': { src: '/photos/party-lights.jpg', alt: 'A crowd gathered under festoon lights at night', place: null, w: 1600, h: 1068, unsplash: '1517457373958-b7bdd4587205' },
  dining: { src: '/photos/dining.jpg', alt: 'A table set for a long restaurant dinner', place: null, w: 1600, h: 1067, unsplash: '1414235077428-338989a2e8c0' },
  'friends-table': { src: '/photos/friends-table.jpg', alt: 'Friends sharing a meal at a long table', place: null, w: 1600, h: 1067, unsplash: '1528605248644-14dd04022da1' },
  surf: { src: '/photos/surf.jpg', alt: 'A surfer riding inside a turquoise wave', place: null, w: 1600, h: 1067, unsplash: '1502680390469-be75c86b636f' },
  'waves-aerial': { src: '/photos/waves-aerial.jpg', alt: 'Waves washing onto white sand, seen from above', place: null, w: 1600, h: 899, unsplash: '1505228395891-9a51e7e86bf6' },
  'park-friends': { src: '/photos/park-friends.jpg', alt: 'Friends laughing together on the grass in a park', place: null, w: 1600, h: 1067, unsplash: '1526976668912-1a811878dd37' },
} as const;

export type PhotoKey = keyof typeof PHOTOS;

/** A photo for a city where we have one; otherwise a summer scene. */
export function cityPhoto(citySlug: string | null | undefined): PhotoKey {
  if (citySlug === 'cape-town' || citySlug === 'stellenbosch' || citySlug === 'hermanus') return 'camps-bay';
  if (citySlug === 'johannesburg' || citySlug === 'pretoria') return 'johannesburg';
  if (citySlug === 'mbombela' || citySlug === 'polokwane') return 'blyde-canyon';
  return 'beach-sunset';
}

/** Photo used for each Explore / What's On category in recommendation cards. */
export const CATEGORY_PHOTOS: Record<string, PhotoKey> = {
  beaches: 'beach-sunset',
  restaurants: 'dining',
  braai: 'braai',
  coffee: 'coffee',
  markets: 'market',
  festivals: 'festival',
  scenic: 'acacia-sunset',
  outdoors: 'camping',
  entertainment: 'concert',
  music: 'concert',
  djs: 'party-lights',
  live: 'concert',
  festival: 'festival',
  'food-market': 'market',
  'christmas-market': 'party-lights',
  outdoor: 'park-friends',
  party: 'party-lights',
  community: 'friends-table',
  sport: 'surf',
  other: 'friends-table',
};
