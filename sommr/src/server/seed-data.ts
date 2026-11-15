/**
 * Default categories, challenges and event sources. Admins can edit all of these
 * in the dashboard; seeding only inserts rows that don't exist yet.
 *
 * Challenges are activity ideas, not listings: they never name a specific
 * business or claim that something is happening.
 */

export interface CategorySeed {
  slug: string;
  kind: 'place' | 'event';
  label: string;
  description: string;
  icon: string;
  color: string;
  osm_filters?: string[];
  event_categories?: string[];
  keywords?: string[];
}

export const CATEGORY_SEED: CategorySeed[] = [
  // Places — imported from OpenStreetMap using the tag filters
  { slug: 'beaches', kind: 'place', label: 'Beaches', description: 'Sand, surf and tidal pools.', icon: 'waves', color: '#4f86b8', osm_filters: ['natural=beach'] },
  { slug: 'restaurants', kind: 'place', label: 'Restaurants', description: 'Somewhere good to eat.', icon: 'utensils', color: '#c0613a', osm_filters: ['amenity=restaurant'] },
  { slug: 'braai', kind: 'place', label: 'Braai spots', description: 'Public braai areas and picnic sites.', icon: 'flame', color: '#a34e2c', osm_filters: ['amenity=bbq', 'leisure=picnic_site'] },
  { slug: 'coffee', kind: 'place', label: 'Coffee shops', description: 'Cafés and coffee bars.', icon: 'coffee', color: '#7e5f45', osm_filters: ['amenity=cafe'] },
  { slug: 'markets', kind: 'place', label: 'Markets', description: 'Markets, padstals and farm shops.', icon: 'shopping-basket', color: '#7f8a3a', osm_filters: ['amenity=marketplace', 'shop=farm'] },
  { slug: 'festivals', kind: 'place', label: 'Festivals', description: 'Festival venues from What’s On.', icon: 'party-popper', color: '#95577f', event_categories: ['festival'] },
  { slug: 'scenic', kind: 'place', label: 'Scenic spots', description: 'Viewpoints and waterfalls.', icon: 'mountain', color: '#3f8580', osm_filters: ['tourism=viewpoint', 'waterway=waterfall'] },
  { slug: 'outdoors', kind: 'place', label: 'Outdoors', description: 'Parks, gardens and nature reserves.', icon: 'trees', color: '#5b864a', osm_filters: ['leisure=park', 'leisure=nature_reserve', 'leisure=garden'] },
  { slug: 'entertainment', kind: 'place', label: 'Entertainment', description: 'Cinemas, theatres, venues and water parks.', icon: 'ticket', color: '#6660a3', osm_filters: ['amenity=cinema', 'amenity=theatre', 'amenity=arts_centre', 'amenity=nightclub', 'leisure=water_park', 'leisure=bowling_alley', 'tourism=theme_park'] },

  // Events — imported events are classified with these keywords
  { slug: 'music', kind: 'event', label: 'Music', description: 'Concerts, gigs and live bands.', icon: 'music', color: '#b4572a', keywords: ['concert', 'live music', 'band', 'jazz', 'gig', 'orchestra', 'choir', 'acoustic', 'symphony', 'unplugged', 'tour'] },
  { slug: 'djs', kind: 'event', label: 'DJs & nightlife', description: 'DJ sets, club nights and dance music.', icon: 'disc-3', color: '#6a5aa6', keywords: ['dj', 'amapiano', 'house music', 'deep house', 'afro house', 'techno', 'gqom', 'club', 'rave', 'nightlife', 'b2b', 'edm', 'trance'] },
  { slug: 'live', kind: 'event', label: 'Live performances', description: 'Comedy, theatre, dance and shows.', icon: 'drama', color: '#8b5a8f', keywords: ['comedy', 'stand-up', 'theatre', 'theater', 'musical', 'ballet', 'dance show', 'cabaret', 'magic', 'drama', 'play', 'opera', 'performance'] },
  { slug: 'festival', kind: 'event', label: 'Festivals', description: 'Multi-act and multi-day festivals.', icon: 'party-popper', color: '#95577f', keywords: ['festival', 'fest '] },
  { slug: 'food-market', kind: 'event', label: 'Food markets', description: 'Night markets, food and wine.', icon: 'shopping-basket', color: '#7f8a3a', keywords: ['market', 'night market', 'food', 'street food', 'wine', 'craft beer', 'gin', 'farmers', 'tasting', 'picnic'] },
  { slug: 'christmas-market', kind: 'event', label: 'Christmas markets', description: 'Festive markets and carols.', icon: 'gift', color: '#a8433a', keywords: ['christmas', 'xmas', 'festive', 'carols', 'santa'] },
  { slug: 'outdoor', kind: 'event', label: 'Outdoor events', description: 'Open-air, trail and sunset events.', icon: 'sun', color: '#5b864a', keywords: ['outdoor', 'open-air', 'open air', 'hike', 'trail', 'sunset', 'yoga', 'beach', 'kayak', 'cycle', 'parkrun', 'picnic'] },
  { slug: 'party', kind: 'event', label: 'Summer parties', description: 'Pool, rooftop, day and New Year parties.', icon: 'sparkles', color: '#c98a2e', keywords: ['party', 'pool party', 'rooftop', 'day party', 'sundowner', 'new year', 'nye', 'countdown'] },
  { slug: 'community', kind: 'event', label: 'Community', description: 'Local, family and charity events.', icon: 'users', color: '#4f86b8', keywords: ['community', 'family', 'kids', 'charity', 'workshop', 'fundraiser', 'clean-up', 'cleanup', 'meetup', 'school', 'church'] },
  { slug: 'sport', kind: 'event', label: 'Sport', description: 'Matches, races and tournaments.', icon: 'trophy', color: '#3f8580', keywords: ['cricket', 'rugby', 'soccer', 'football', 'marathon', 'race', 'match', 'tournament', 'surf', 'golf', 'tennis', 'triathlon', 'vs'] },
  { slug: 'other', kind: 'event', label: 'Other', description: 'Everything else worth knowing about.', icon: 'calendar', color: '#7c756b' },
];

export interface ChallengeSeed {
  slug: string;
  kind: 'daily' | 'weekly';
  title: string;
  description: string;
  tip?: string;
  interests?: string[];
  cost: 'free' | 'low' | 'medium';
  points: number;
  place_category?: string;
  coastal_only?: boolean;
  months?: number[];
}

export const CHALLENGE_SEED: ChallengeSeed[] = [
  // ─── Daily ───
  { slug: 'new-coffee-shop', kind: 'daily', title: 'Try a new coffee shop', description: 'Pick a café you’ve never been to and order something you’d usually skip.', tip: 'Sit outside if you can — people-watching is half the point.', interests: ['food', 'relaxation', 'markets'], cost: 'low', points: 10, place_category: 'coffee' },
  { slug: 'watch-the-sunset', kind: 'daily', title: 'Watch the sunset', description: 'Find a west-facing spot and put your phone away for the last ten minutes of light.', tip: 'Check tonight’s sunset time on your dashboard and arrive 20 minutes early.', cost: 'free', points: 10, place_category: 'scenic' },
  { slug: 'visit-a-market', kind: 'daily', title: 'Visit a local market', description: 'Wander a market, chat to a maker and bring home one small thing.', interests: ['markets', 'food'], cost: 'low', points: 15, place_category: 'markets' },
  { slug: 'braai-together', kind: 'daily', title: 'Have a braai with friends or family', description: 'Light the fire, invite your people and let it run late.', tip: 'Make it a bring-and-braai so nobody carries the whole cost.', interests: ['food'], cost: 'low', points: 15, place_category: 'braai' },
  { slug: 'explore-somewhere-new', kind: 'daily', title: 'Explore somewhere new', description: 'Walk a street, suburb or trail you’ve never explored — no destination needed.', cost: 'free', points: 10 },
  { slug: 'beach-day', kind: 'daily', title: 'Visit a beach', description: 'Toes in the sand, even if it’s just for an hour.', tip: 'Swim between the flags and check the tide before you go.', interests: ['beaches', 'relaxation'], cost: 'free', points: 15, place_category: 'beaches', coastal_only: true },
  { slug: 'new-restaurant', kind: 'daily', title: 'Try a new restaurant', description: 'Book a table somewhere you’ve never eaten and order the house special.', interests: ['food'], cost: 'medium', points: 15, place_category: 'restaurants' },
  { slug: 'outdoor-picnic', kind: 'daily', title: 'Have an outdoor picnic', description: 'Pack a blanket, something cold to drink and find a patch of shade.', interests: ['relaxation', 'outdoors', 'food'], cost: 'low', points: 15, place_category: 'outdoors' },
  { slug: 'hidden-gem', kind: 'daily', title: 'Discover a hidden gem', description: 'Open Explore, zoom into your area and visit a place you didn’t know existed.', cost: 'free', points: 20 },
  { slug: 'catch-the-sunrise', kind: 'daily', title: 'Catch a sunrise', description: 'Set the alarm, grab a flask and watch the day begin.', interests: ['outdoors', 'relaxation'], cost: 'free', points: 15, place_category: 'scenic' },
  { slug: 'ice-cream-walk', kind: 'daily', title: 'Go for an ice-cream walk', description: 'One scoop, one slow walk, no rush.', interests: ['food', 'relaxation'], cost: 'low', points: 5 },
  { slug: 'swim-outdoors', kind: 'daily', title: 'Swim outdoors', description: 'A public pool, tidal pool, dam or the sea — just get in the water.', interests: ['beaches', 'outdoors'], cost: 'free', points: 15 },
  { slug: 'tidal-pool', kind: 'daily', title: 'Swim in a tidal pool', description: 'Find a tidal pool and take a dip when the sea is too wild for swimming.', interests: ['beaches'], cost: 'free', points: 15, place_category: 'beaches', coastal_only: true },
  { slug: 'nature-walk', kind: 'daily', title: 'Do a short hike or nature walk', description: 'An hour on a trail or through a reserve. Bring water and a hat.', interests: ['outdoors'], cost: 'free', points: 20, place_category: 'outdoors' },
  { slug: 'live-music', kind: 'daily', title: 'Listen to live music', description: 'A band at a bar, a busker at a market or a full concert — it all counts.', interests: ['music', 'festivals'], cost: 'medium', points: 20, place_category: 'entertainment' },
  { slug: 'stargazing', kind: 'daily', title: 'Stargaze for twenty minutes', description: 'Get away from the brightest lights and look for the Southern Cross.', interests: ['relaxation', 'outdoors'], cost: 'free', points: 10 },
  { slug: 'cook-a-classic', kind: 'daily', title: 'Cook a South African classic', description: 'Bobotie, chakalaka, pap en vleis or malva pudding — make it from scratch.', interests: ['food'], cost: 'low', points: 15 },
  { slug: 'phone-free-afternoon', kind: 'daily', title: 'Spend a phone-free afternoon outside', description: 'Three hours outdoors with your phone on silent and out of sight.', interests: ['relaxation'], cost: 'free', points: 15 },
  { slug: 'day-trip', kind: 'daily', title: 'Take a day trip', description: 'Drive somewhere within 100 km you’ve never been and stay for lunch.', interests: ['road-trips'], cost: 'medium', points: 25 },
  { slug: 'scenic-drive', kind: 'daily', title: 'Do a scenic drive', description: 'Take the long way, and stop at a viewpoint along the route.', interests: ['road-trips'], cost: 'low', points: 20, place_category: 'scenic' },
  { slug: 'padstal-stop', kind: 'daily', title: 'Stop at a padstal', description: 'Pull over at a farm stall for rusks, pies or something you’ve never tried.', interests: ['road-trips', 'food', 'markets'], cost: 'low', points: 15, place_category: 'markets' },
  { slug: 'sundowners', kind: 'daily', title: 'Have sundowners with friends', description: 'Something cold, good company and the sky doing its thing.', interests: ['relaxation', 'music'], cost: 'low', points: 10, place_category: 'scenic' },
  { slug: 'photo-walk', kind: 'daily', title: 'Go on a photo walk', description: 'Capture five colours of summer around you and add the best one to My Summer.', cost: 'free', points: 10 },
  { slug: 'bike-ride', kind: 'daily', title: 'Go for a bike ride', description: 'A loop around the neighbourhood or a proper trail — your call.', interests: ['outdoors'], cost: 'free', points: 15, place_category: 'outdoors' },
  { slug: 'gallery-visit', kind: 'daily', title: 'Visit a gallery, theatre or museum', description: 'Spend an hour with something made by someone else.', interests: ['music', 'relaxation'], cost: 'low', points: 15, place_category: 'entertainment' },
  { slug: 'thrift-find', kind: 'daily', title: 'Find a treasure second-hand', description: 'Hunt through a flea market or thrift store for one great find.', interests: ['markets'], cost: 'low', points: 10, place_category: 'markets' },
  { slug: 'random-kindness', kind: 'daily', title: 'Do something kind for a stranger', description: 'Buy a car guard a cold drink, pay a compliment, help someone carry something.', cost: 'free', points: 10 },
  { slug: 'park-hour', kind: 'daily', title: 'Spend an hour in a park', description: 'Read, nap, people-watch. Doing nothing is allowed.', interests: ['relaxation', 'outdoors'], cost: 'free', points: 10, place_category: 'outdoors' },
  { slug: 'street-food', kind: 'daily', title: 'Try a street food you’ve never had', description: 'Bunny chow, a gatsby, vetkoek or a kota — be brave.', interests: ['food'], cost: 'low', points: 15 },
  { slug: 'summer-fruit', kind: 'daily', title: 'Eat proper summer fruit', description: 'Litchis, mangoes or an ice-cold watermelon, shared if you’re feeling generous.', interests: ['food', 'relaxation'], cost: 'low', points: 5 },
  { slug: 'dance-outside', kind: 'daily', title: 'Dance to a full song outdoors', description: 'Pick a summer anthem, press play and commit to the whole thing.', interests: ['music'], cost: 'free', points: 5 },
  { slug: 'summer-playlist', kind: 'daily', title: 'Make a summer playlist', description: 'Twenty songs that sound like this summer. Share it with one person.', interests: ['music', 'road-trips'], cost: 'free', points: 5 },
  { slug: 'reconnect', kind: 'daily', title: 'Plan a meet-up with an old friend', description: 'Message someone you haven’t seen in a while and set a date.', cost: 'free', points: 10 },
  { slug: 'try-a-water-sport', kind: 'daily', title: 'Try a water sport', description: 'A surf lesson, stand-up paddling or a kayak on a lagoon or dam.', interests: ['beaches', 'outdoors'], cost: 'medium', points: 25 },
  { slug: 'rock-pools', kind: 'daily', title: 'Explore rock pools at low tide', description: 'Look for anemones, starfish and tiny fish. Leave everything where you found it.', interests: ['beaches', 'outdoors'], cost: 'free', points: 15, place_category: 'beaches', coastal_only: true },
  { slug: 'go-to-an-event', kind: 'daily', title: 'Go to a festival or local event', description: 'Pick something from What’s On and actually go.', interests: ['festivals', 'music'], cost: 'medium', points: 25 },
  { slug: 'festive-lights', kind: 'daily', title: 'Visit a Christmas market', description: 'Browse the stalls, find a small gift and soak up the festive buzz.', interests: ['markets', 'festivals'], cost: 'low', points: 15, months: [11, 12] },
  { slug: 'summer-highlights', kind: 'daily', title: 'Write down your summer highlights', description: 'Three moments from this summer so far — add them to My Summer.', cost: 'free', points: 10, months: [1, 2] },
  { slug: 'handwritten-note', kind: 'daily', title: 'Send someone a handwritten note', description: 'A postcard, a letter or a note under the door.', cost: 'free', points: 5 },
  { slug: 'farm-visit', kind: 'daily', title: 'Visit a farm', description: 'A wine farm, olive farm or pick-your-own berry farm.', interests: ['road-trips', 'food'], cost: 'medium', points: 20 },
  { slug: 'botanical-garden', kind: 'daily', title: 'Visit a botanical garden', description: 'Find a bench in the shade and learn the name of one new plant.', interests: ['outdoors', 'relaxation'], cost: 'low', points: 15, place_category: 'outdoors' },
  { slug: 'braai-something-new', kind: 'daily', title: 'Braai something new', description: 'Snoek, braaibroodjies, a veggie potjie — try something you’ve never braaied.', interests: ['food'], cost: 'low', points: 15, place_category: 'braai' },
  { slug: 'clean-up', kind: 'daily', title: 'Join or start a clean-up', description: 'Spend half an hour picking up litter at a beach, river or park.', interests: ['outdoors', 'beaches'], cost: 'free', points: 25 },
  { slug: 'outdoor-movie', kind: 'daily', title: 'Watch a film under the stars', description: 'An open-air screening, or a projector against a garden wall.', interests: ['relaxation', 'music'], cost: 'low', points: 15, place_category: 'entertainment' },

  // ─── Weekly ───
  { slug: 'three-new-places', kind: 'weekly', title: 'Visit three places you’ve never been', description: 'Cafés, viewpoints, markets — anything new counts. Mark them as visited in Explore.', cost: 'low', points: 50 },
  { slug: 'weekend-road-trip', kind: 'weekly', title: 'Take a weekend road trip', description: 'Plan a route, pack snacks and stay somewhere new for at least one night.', interests: ['road-trips'], cost: 'medium', points: 60 },
  { slug: 'live-event-week', kind: 'weekly', title: 'Go to a live event', description: 'A gig, a festival, a show or a match — find one in What’s On.', interests: ['music', 'festivals'], cost: 'medium', points: 50 },
  { slug: 'host-a-braai', kind: 'weekly', title: 'Host a braai or potluck', description: 'Invite at least four people. Bonus points for someone new.', interests: ['food'], cost: 'low', points: 50 },
  { slug: 'five-hours-outside', kind: 'weekly', title: 'Spend five hours outdoors', description: 'Add it up across the week: walks, swims, sunsets, picnics.', interests: ['outdoors', 'relaxation'], cost: 'free', points: 40 },
  { slug: 'beach-hop', kind: 'weekly', title: 'Visit two different beaches', description: 'One familiar favourite and one you’ve never been to.', interests: ['beaches'], cost: 'free', points: 50, coastal_only: true },
  { slug: 'support-local', kind: 'weekly', title: 'Support three local businesses', description: 'Buy from three small, local businesses this week.', interests: ['markets', 'food'], cost: 'low', points: 40 },
  { slug: 'three-sunsets', kind: 'weekly', title: 'Watch three sunsets', description: 'Three evenings, three different spots if you can.', cost: 'free', points: 40 },
  { slug: 'five-memories', kind: 'weekly', title: 'Add five memories to My Summer', description: 'Photos, notes or places — keep a record of the good stuff.', cost: 'free', points: 40 },
  { slug: 'big-hike', kind: 'weekly', title: 'Complete a proper hike', description: 'Two hours or more on a trail. Start early and tell someone your route.', interests: ['outdoors'], cost: 'free', points: 60 },
  { slug: 'screen-free-evening', kind: 'weekly', title: 'Host a screen-free evening', description: 'Games, music and conversation — phones in a basket at the door.', interests: ['relaxation'], cost: 'free', points: 30 },
  { slug: 'new-cuisine', kind: 'weekly', title: 'Try a cuisine you’ve never eaten', description: 'Ethiopian, Portuguese, Cape Malay, Korean — somewhere new for your taste buds.', interests: ['food'], cost: 'medium', points: 40 },
];

export interface EventSourceSeed {
  kind: 'ticketmaster' | 'quicket';
  name: string;
  city_slug: string | null;
  config: Record<string, unknown>;
}

/** Provider sources created on first run. They stay idle until their API key is set. */
export const EVENT_SOURCE_SEED: EventSourceSeed[] = [
  { kind: 'ticketmaster', name: 'Ticketmaster · Johannesburg', city_slug: 'johannesburg', config: { radiusKm: 40 } },
  { kind: 'ticketmaster', name: 'Ticketmaster · Cape Town', city_slug: 'cape-town', config: { radiusKm: 50 } },
  { kind: 'ticketmaster', name: 'Ticketmaster · Pretoria', city_slug: 'pretoria', config: { radiusKm: 30 } },
  { kind: 'ticketmaster', name: 'Ticketmaster · Durban', city_slug: 'durban', config: { radiusKm: 40 } },
  { kind: 'quicket', name: 'Quicket · South Africa', city_slug: null, config: { maxPages: 20, pageSize: 100 } },
];
