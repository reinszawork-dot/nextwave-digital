/**
 * SAMPLE DATA for the illustrative product dashboards ("Inside the apps").
 * These numbers are not business statistics: they are realistic examples of what one
 * person might see inside each app, and are always labelled "Sample data" on the site.
 * Each chart mirrors a view the real app actually has.
 */
import type { ProductId } from './products';
import type { Unit } from '../lib/chart';

export interface Kpi { label: string; value: number; unit?: Unit; note?: string }
export interface Showcase {
  headline: string;
  line: {
    title: string;
    labels: string[];
    series: { label: string; values: number[]; color?: string; area?: boolean; dashed?: boolean }[];
    unit?: Unit;
    labelEvery?: number;
  };
  bars: { title: string; labels: string[]; values: number[]; unit?: Unit };
  ring: { label: string; value: number; max: number; display: string; sub: string };
  kpis: Kpi[];
}

const rand: Unit = { prefix: 'R ' };

export const showcase: Record<ProductId, Showcase> = {
  wisely: {
    headline: 'See the month before it happens.',
    line: {
      title: 'Spending vs. budget pace · this pay month',
      labels: ['25 Oct', '28 Oct', '31 Oct', '3 Nov', '6 Nov', '9 Nov', '12 Nov', '15 Nov', '18 Nov', '21 Nov'],
      series: [
        { label: 'Spent so far', values: [1200, 3400, 5100, 6400, 8900, 10200, 11800, 13100, 14600, 15900], area: true },
        { label: 'Budget pace', values: [600, 2400, 4200, 6000, 7800, 9600, 11400, 13200, 15000, 16800], color: '#8c867a', dashed: true },
      ],
      unit: rand,
      labelEvery: 3,
    },
    bars: {
      title: 'Spending by category',
      labels: ['Food', 'Travel', 'Bills', 'Dining', 'Data', 'Fun'],
      values: [3420, 1680, 1250, 940, 499, 380],
      unit: rand,
    },
    ring: { label: 'Budget used', value: 74, max: 100, display: '74%', sub: 'R 13 240 of R 18 000' },
    kpis: [
      { label: 'Left to spend', value: 6760, unit: rand },
      { label: 'Saved toward goals', value: 1500, unit: rand },
      { label: 'Days to payday', value: 12 },
    ],
  },
  lull: {
    headline: 'Understand how sleep and stress connect.',
    line: {
      title: 'Sleep logged · last 14 nights',
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      series: [{ label: 'Hours asleep', values: [6.5, 7.2, 5.8, 7.6, 6.9, 8.1, 7.4, 6.2, 7.0, 7.8, 6.6, 7.3, 8.0, 7.5], area: true }],
      unit: { suffix: ' h', decimals: 1 },
      labelEvery: 2,
    },
    bars: {
      title: 'Cravings logged · this week',
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      values: [3, 1, 4, 1, 2, 0, 1],
    },
    ring: { label: 'Wind-down nights', value: 5, max: 7, display: '5/7', sub: 'Checklist completed this week' },
    kpis: [
      { label: 'Average sleep', value: 7.1, unit: { suffix: ' h', decimals: 1 } },
      { label: 'Breathing sessions', value: 9 },
      { label: 'Urges ridden out', value: 12 },
    ],
  },
  kindling: {
    headline: 'Make consistency visible.',
    line: {
      title: 'Weekly completion rate · last 12 weeks',
      labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12'],
      series: [{ label: 'Habits completed', values: [48, 55, 52, 61, 66, 63, 72, 75, 71, 79, 83, 86], area: true }],
      unit: { suffix: '%' },
      labelEvery: 2,
    },
    bars: {
      title: 'Best days · completion by weekday',
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      values: [82, 88, 79, 85, 64, 58, 70],
      unit: { suffix: '%' },
    },
    ring: { label: 'Today', value: 4, max: 5, display: '4/5', sub: 'Habits checked in' },
    kpis: [
      { label: 'Current streak', value: 21, unit: { suffix: ' days' } },
      { label: 'Active habits', value: 5 },
      { label: 'Badges earned', value: 7 },
    ],
  },
  studyhub: {
    headline: 'Study with a plan, not panic.',
    line: {
      title: 'Study hours per week · this term',
      labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
      series: [{ label: 'Hours studied', values: [6.5, 8.2, 7.4, 9.8, 11.0, 10.2, 12.4, 11.0], area: true }],
      unit: { suffix: ' h', decimals: 1 },
    },
    bars: {
      title: 'This week · hours per day',
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      values: [2.4, 1.6, 2.9, 2.1, 1.2, 0.8, 0],
      unit: { suffix: ' h', decimals: 1 },
    },
    ring: { label: 'Daily goal', value: 72, max: 100, display: '72%', sub: '1h 26m of 2h' },
    kpis: [
      { label: 'Study streak', value: 14, unit: { suffix: ' days' } },
      { label: 'Tasks completed', value: 23 },
      { label: 'Days to next exam', value: 9 },
    ],
  },
};
