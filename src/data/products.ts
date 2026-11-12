/**
 * The NextWave product line. Feature lists describe ONLY what each app does today —
 * keep them in sync with the apps themselves.
 *
 * `appUrl` is the live app link. While it is `null`, the site shows a
 * "Link coming soon" state instead of a dead button.
 */
export type ProductId = 'wisely' | 'lull' | 'kindling' | 'studyhub' | 'forge' | 'cashbook';

export interface Product {
  id: ProductId;
  name: string;
  category: string;
  summary: string;
  pitch: string;
  /** Product accent, used for the icon, preview and detail page highlights. */
  accent: string;
  accentSoft: string;
  features: { title: string; text: string }[];
  appUrl: string | null;
}

export const products: Product[] = [
  {
    id: 'wisely',
    name: 'Wisely',
    category: 'Budgeting',
    summary:
      'A simple financial organisation tool that helps users manage their monthly budgets and track expenses.',
    pitch:
      'Wisely gives every rand a job. Plan your month around payday, log what you spend and see exactly where your money goes — with clear, animated reports.',
    accent: '#4f8a68',
    accentSoft: 'rgba(79, 138, 104, 0.12)',
    features: [
      { title: 'Monthly budgets', text: 'Set spending limits per category and watch your progress through the month.' },
      { title: 'Expense tracking', text: 'Log transactions quickly and review all your activity in one place.' },
      { title: 'Payday-based months', text: 'Budget months run from payday to payday, set to the date you are actually paid.' },
      { title: 'Goals and debts', text: 'Track savings goals and debts alongside your everyday budget.' },
      { title: 'Recurring payments', text: 'Keep regular bills and subscriptions visible so nothing catches you off guard.' },
      { title: 'Reports and charts', text: 'Animated charts show spending by category and over time.' },
    ],
    appUrl: 'https://wisely-phi.vercel.app',
  },
  {
    id: 'lull',
    name: 'Lull',
    category: 'Sleep & Stress',
    summary:
      'A personal wellbeing tool designed to help users understand their sleep patterns and everyday stress.',
    pitch:
      'Lull is a calm space for stressful moments and restless nights. Pause before a craving, breathe it out, wind down properly and see how sleep and stress connect over time.',
    accent: '#7d6bb0',
    accentSoft: 'rgba(125, 107, 176, 0.12)',
    features: [
      { title: 'Craving pause', text: 'An in-the-moment toolkit for stress eating: rate the urge, check what you really need and ride it out.' },
      { title: 'Guided breathing', text: 'A visual breathing guide to slow down when stress builds up.' },
      { title: 'Sleep log', text: 'Record your nights and build a picture of your sleep patterns.' },
      { title: 'Wind-down routine', text: 'A bedtime checklist, soundscapes and narrated sleep stories to help you switch off.' },
      { title: '10-day course', text: 'Short daily lessons on understanding stress and breaking the stress-eating loop.' },
      { title: 'Journey insights', text: 'See how your sleep and your cravings relate to each other over time.' },
    ],
    appUrl: 'https://lull-weld.vercel.app',
  },
  {
    id: 'kindling',
    name: 'Kindling',
    category: 'Habits',
    summary:
      'A productivity tool that helps users build positive routines, track progress and stay consistent.',
    pitch:
      'Kindling makes consistency visible. Check in on your habits each day, keep your streaks alive and watch small actions add up across weeks and months.',
    accent: '#c9774f',
    accentSoft: 'rgba(201, 119, 79, 0.12)',
    features: [
      { title: 'Daily check-ins', text: 'Tick off habits in seconds from a simple daily view.' },
      { title: 'Streaks', text: 'Keep the fire going — streaks show how consistent you have been.' },
      { title: 'Reminders', text: 'Optional reminders nudge you at the times that suit you.' },
      { title: 'Progress stats', text: '30-day, 20-week and full-year views, plus your best days and per-habit breakdowns.' },
      { title: 'Mood and notes', text: 'Add a mood and a note to your day to see how habits and wellbeing connect.' },
      { title: 'Badges', text: 'Earn badges as milestones are reached.' },
    ],
    appUrl: 'https://kindling-inky.vercel.app',
  },
  {
    id: 'studyhub',
    name: 'StudyHub',
    category: 'Study & Exams',
    summary:
      'A student productivity tool that helps students organise their studies, manage their time and track academic progress.',
    pitch:
      'StudyHub keeps everything a student needs in one calm place. Focus with a study timer, plan around exams and deadlines, and watch your hours, marks and streaks improve week by week.',
    accent: '#3a8a86',
    accentSoft: 'rgba(58, 138, 134, 0.12)',
    features: [
      { title: 'Study timer', text: 'Pomodoro-style focus sessions with breaks, logged automatically to your study history.' },
      { title: 'Exams and deadlines', text: 'A study calendar for exams and assignments, with countdowns on your dashboard.' },
      { title: 'Tasks by subject', text: 'A task manager with due dates, priorities and completion checkboxes, organised by subject.' },
      { title: 'Notes', text: 'Autosaving notes you can search, pin and file under each subject.' },
      { title: 'Analytics', text: 'Interactive charts for weekly hours, monthly productivity, subject marks and time split.' },
      { title: 'Goals and streaks', text: 'Daily and weekly study goals, personal goals, streaks and achievements to keep you going.' },
    ],
    appUrl: 'https://studyhub-tau-eight.vercel.app',
  },
  {
    id: 'forge',
    name: 'Forge',
    category: 'Fitness & Nutrition',
    summary:
      'A fitness tool that combines workout logging with calorie and macro tracking, so training and eating are planned in one place.',
    pitch:
      'Forge is your gym logbook and food diary in one. Log sets in seconds, let it tell you what to lift next, and hit calorie and protein targets worked out from your own body and goal.',
    accent: '#6f8a2c',
    accentSoft: 'rgba(111, 138, 44, 0.13)',
    features: [
      { title: 'Workout logger', text: 'Routines, last session’s numbers beside every set, an automatic rest timer and personal-record alerts.' },
      { title: 'Smart progression', text: 'Suggests your next weight and reps from how the last session went, spots stalls and plans deload weeks.' },
      { title: 'Calorie and macro diary', text: 'Daily calorie, protein, carb and fat targets from your profile, with meals and water tracking.' },
      { title: 'Barcode and food search', text: 'Scan packaged food or search Open Food Facts, with South African products and staples like pap and biltong.' },
      { title: 'Progress charts', text: 'A smoothed weight trend, calories against target, muscles trained this week and strength over time.' },
      { title: 'Exercise guides', text: 'Form cues, muscles worked and the most common mistake for every exercise in the library.' },
    ],
    appUrl: 'https://reinszawork-dot.github.io/forge/',
  },
  {
    id: 'cashbook',
    name: 'Side Hustle CashBook',
    category: 'Side Hustles',
    summary:
      'A cash book for side hustles that tracks money in and out across several income streams, so you can see what each one really earns.',
    pitch:
      'Side Hustle CashBook shows which hustle actually pays. Record every rand in and out, keep each income stream separate, chase who still owes you and put a slice aside for tax — from your first R500 to several small businesses.',
    accent: '#b0508f',
    accentSoft: 'rgba(176, 80, 143, 0.12)',
    features: [
      { title: 'Cash book', text: 'Record money in and out with a category and payment method — cash, EFT, card, SnapScan or Zapper — then search and filter it.' },
      { title: 'Income streams', text: 'Give each side hustle its own income, expenses, profit and history, and see which one performs best.' },
      { title: 'Who owes me', text: 'Track unpaid customers with due dates. Mark a payment as received and it lands in your cash book.' },
      { title: 'Tax set-aside', text: 'Choose a percentage of profit to put aside across the March to February tax year. A savings helper, not tax advice.' },
      { title: 'Savings goals', text: 'Set a target, add money as you go and see how much to save each month to get there.' },
      { title: 'Reports and CSV export', text: 'Monthly and tax-year reports with income against expenses, profit trends and stream comparisons, exportable as CSV.' },
    ],
    appUrl: '/cashbook/',
  },
];

export const getProduct = (id: string) => products.find((p) => p.id === id);

/** Shared principles that are true of every NextWave product today. */
export const principles = [
  {
    title: 'Private by design',
    text: 'Our apps keep your data on your own device. No accounts to create, nothing to hand over.',
    icon: 'shield',
  },
  {
    title: 'Works offline',
    text: 'Install them like a native app and use them anywhere — even without a connection.',
    icon: 'offline',
  },
  {
    title: 'Focused and simple',
    text: 'Each tool does one everyday job well, with a calm interface that stays out of your way.',
    icon: 'spark',
  },
] as const;
