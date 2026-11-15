import type { PhotoKey } from './photos';

/** Suggested bucket-list ideas. Activities only — never specific businesses or dated events. */
export interface BucketSuggestion {
  slug: string;
  title: string;
  interest: string;
  /** Photo for recommendation cards (falls back to the interest's photo). */
  photo?: PhotoKey;
}

export const BUCKET_SUGGESTIONS: BucketSuggestion[] = [
  { slug: 'sunrise-swim', title: 'Swim in the sea at sunrise', interest: 'beaches', photo: 'beach-sunset' },
  { slug: 'learn-to-surf', title: 'Take a surf lesson', interest: 'beaches', photo: 'surf' },
  { slug: 'tidal-pool-tour', title: 'Swim in three different tidal pools', interest: 'beaches', photo: 'waves-aerial' },
  { slug: 'dolphins', title: 'Spot dolphins from the shore', interest: 'beaches', photo: 'waves-aerial' },
  { slug: 'mountain-sunset', title: 'Watch the sunset from a mountain top', interest: 'outdoors', photo: 'acacia-sunset' },
  { slug: 'camp-under-stars', title: 'Camp under the stars', interest: 'outdoors', photo: 'camping' },
  { slug: 'waterfall-hike', title: 'Hike to a waterfall', interest: 'outdoors' },
  { slug: 'game-drive', title: 'Go on a game drive', interest: 'outdoors', photo: 'acacia-sunset' },
  { slug: 'kayak-lagoon', title: 'Kayak or paddle on a lagoon', interest: 'outdoors', photo: 'waves-aerial' },
  { slug: 'coastal-road-trip', title: 'Do a coastal road trip', interest: 'road-trips', photo: 'camps-bay' },
  { slug: 'new-province', title: 'Visit a province you’ve never been to', interest: 'road-trips' },
  { slug: 'mountain-pass', title: 'Drive a famous mountain pass', interest: 'road-trips' },
  { slug: 'small-town-weekend', title: 'Spend a weekend in a small town', interest: 'road-trips', photo: 'blyde-canyon' },
  { slug: 'cook-a-potjie', title: 'Cook a potjie from scratch', interest: 'food' },
  { slug: 'bunny-chow', title: 'Eat a proper Durban bunny chow', interest: 'food', photo: 'dining' },
  { slug: 'wine-farm-picnic', title: 'Have a picnic on a wine farm', interest: 'food', photo: 'park-friends' },
  { slug: 'host-summer-dinner', title: 'Host a long summer dinner outdoors', interest: 'food', photo: 'friends-table' },
  { slug: 'outdoor-gig', title: 'See a live band outdoors', interest: 'music' },
  { slug: 'dance-till-sunrise', title: 'Dance until sunrise', interest: 'music', photo: 'party-lights' },
  { slug: 'summer-festival', title: 'Go to a summer music festival', interest: 'festivals', photo: 'festival' },
  { slug: 'nye-fireworks', title: 'Watch New Year’s fireworks', interest: 'festivals', photo: 'party-lights' },
  { slug: 'christmas-market', title: 'Visit a Christmas market', interest: 'markets', photo: 'party-lights' },
  { slug: 'night-market', title: 'Shop at a night market', interest: 'markets', photo: 'market' },
  { slug: 'makers-market', title: 'Buy something handmade from a maker', interest: 'markets', photo: 'market' },
  { slug: 'no-phone-day', title: 'Spend a whole day without your phone', interest: 'relaxation' },
  { slug: 'hammock-book', title: 'Finish a book in the shade', interest: 'relaxation', photo: 'unwind' },
  { slug: 'spa-day', title: 'Take a proper rest day — spa, pool or nap', interest: 'relaxation' },
  { slug: 'photo-album', title: 'Make a printed summer photo album', interest: 'relaxation', photo: 'park-friends' },
];
