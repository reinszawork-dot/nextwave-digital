/** Suggested bucket-list ideas. Activities only — never specific businesses or dated events. */
export interface BucketSuggestion {
  slug: string;
  title: string;
  interest: string;
}

export const BUCKET_SUGGESTIONS: BucketSuggestion[] = [
  { slug: 'sunrise-swim', title: 'Swim in the sea at sunrise', interest: 'beaches' },
  { slug: 'learn-to-surf', title: 'Take a surf lesson', interest: 'beaches' },
  { slug: 'tidal-pool-tour', title: 'Swim in three different tidal pools', interest: 'beaches' },
  { slug: 'dolphins', title: 'Spot dolphins from the shore', interest: 'beaches' },
  { slug: 'mountain-sunset', title: 'Watch the sunset from a mountain top', interest: 'outdoors' },
  { slug: 'camp-under-stars', title: 'Camp under the stars', interest: 'outdoors' },
  { slug: 'waterfall-hike', title: 'Hike to a waterfall', interest: 'outdoors' },
  { slug: 'game-drive', title: 'Go on a game drive', interest: 'outdoors' },
  { slug: 'kayak-lagoon', title: 'Kayak or paddle on a lagoon', interest: 'outdoors' },
  { slug: 'coastal-road-trip', title: 'Do a coastal road trip', interest: 'road-trips' },
  { slug: 'new-province', title: 'Visit a province you’ve never been to', interest: 'road-trips' },
  { slug: 'mountain-pass', title: 'Drive a famous mountain pass', interest: 'road-trips' },
  { slug: 'small-town-weekend', title: 'Spend a weekend in a small town', interest: 'road-trips' },
  { slug: 'cook-a-potjie', title: 'Cook a potjie from scratch', interest: 'food' },
  { slug: 'bunny-chow', title: 'Eat a proper Durban bunny chow', interest: 'food' },
  { slug: 'wine-farm-picnic', title: 'Have a picnic on a wine farm', interest: 'food' },
  { slug: 'host-summer-dinner', title: 'Host a long summer dinner outdoors', interest: 'food' },
  { slug: 'outdoor-gig', title: 'See a live band outdoors', interest: 'music' },
  { slug: 'dance-till-sunrise', title: 'Dance until sunrise', interest: 'music' },
  { slug: 'summer-festival', title: 'Go to a summer music festival', interest: 'festivals' },
  { slug: 'nye-fireworks', title: 'Watch New Year’s fireworks', interest: 'festivals' },
  { slug: 'christmas-market', title: 'Visit a Christmas market', interest: 'markets' },
  { slug: 'night-market', title: 'Shop at a night market', interest: 'markets' },
  { slug: 'makers-market', title: 'Buy something handmade from a maker', interest: 'markets' },
  { slug: 'no-phone-day', title: 'Spend a whole day without your phone', interest: 'relaxation' },
  { slug: 'hammock-book', title: 'Finish a book in the shade', interest: 'relaxation' },
  { slug: 'spa-day', title: 'Take a proper rest day — spa, pool or nap', interest: 'relaxation' },
  { slug: 'photo-album', title: 'Make a printed summer photo album', interest: 'relaxation' },
];
