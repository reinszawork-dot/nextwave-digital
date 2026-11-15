/** Badges users earn as they use SOMMR. Rules are evaluated on the server from real activity. */
export interface AchievementDef {
  slug: string;
  title: string;
  description: string;
  icon: 'sun' | 'flame' | 'trophy' | 'camera' | 'map' | 'waves' | 'list' | 'star' | 'compass' | 'sparkles';
  /** Stats key and threshold that unlock it. */
  stat: keyof AchievementStats;
  target: number;
}

export interface AchievementStats {
  challengesDone: number;
  weeklyDone: number;
  bestStreak: number;
  bucketAdded: number;
  bucketDone: number;
  memories: number;
  photos: number;
  placesVisited: number;
  visitedCategories: number;
  beachesVisited: number;
  points: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { slug: 'first-step', title: 'First light', description: 'Complete your first summer challenge.', icon: 'sun', stat: 'challengesDone', target: 1 },
  { slug: 'streak-3', title: 'On a roll', description: 'Complete daily challenges three days in a row.', icon: 'flame', stat: 'bestStreak', target: 3 },
  { slug: 'streak-7', title: 'Week of summer', description: 'A seven-day challenge streak.', icon: 'flame', stat: 'bestStreak', target: 7 },
  { slug: 'challenges-10', title: 'Yes person', description: 'Complete ten challenges.', icon: 'trophy', stat: 'challengesDone', target: 10 },
  { slug: 'challenges-25', title: 'Summer regular', description: 'Complete twenty-five challenges.', icon: 'trophy', stat: 'challengesDone', target: 25 },
  { slug: 'weekly-3', title: 'Big weeks', description: 'Complete three weekly challenges.', icon: 'star', stat: 'weeklyDone', target: 3 },
  { slug: 'bucket-5', title: 'Dreamer', description: 'Add five things to your bucket list.', icon: 'list', stat: 'bucketAdded', target: 5 },
  { slug: 'bucket-done-5', title: 'Doer', description: 'Tick off five bucket list items.', icon: 'list', stat: 'bucketDone', target: 5 },
  { slug: 'memory-1', title: 'Keepsake', description: 'Save your first summer memory.', icon: 'camera', stat: 'memories', target: 1 },
  { slug: 'memory-10', title: 'Storyteller', description: 'Save ten summer memories.', icon: 'camera', stat: 'memories', target: 10 },
  { slug: 'photos-10', title: 'Shutterbug', description: 'Add ten photos to My Summer.', icon: 'camera', stat: 'photos', target: 10 },
  { slug: 'visited-5', title: 'Explorer', description: 'Mark five places as visited.', icon: 'compass', stat: 'placesVisited', target: 5 },
  { slug: 'variety-5', title: 'All-rounder', description: 'Visit places in five different categories.', icon: 'map', stat: 'visitedCategories', target: 5 },
  { slug: 'beaches-3', title: 'Salt in your hair', description: 'Visit three different beaches.', icon: 'waves', stat: 'beachesVisited', target: 3 },
  { slug: 'points-500', title: 'Summer spirit', description: 'Collect 500 points.', icon: 'sparkles', stat: 'points', target: 500 },
  { slug: 'points-1000', title: 'Summer legend', description: 'Collect 1,000 points.', icon: 'sparkles', stat: 'points', target: 1000 },
];

/** Points for actions other than challenges (challenges carry their own points). */
export const POINTS = {
  bucketDone: 20,
  memory: 5,
  visit: 5,
} as const;
