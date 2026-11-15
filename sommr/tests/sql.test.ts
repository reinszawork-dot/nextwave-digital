import { describe, expect, it } from 'vitest';
import { sql } from '@/server/sql';

describe('sql builder', () => {
  it('numbers parameters and never interpolates values', () => {
    const q = sql`select * from users where email = ${"x' or 1=1 --"} and id = ${5}`.compile();
    expect(q.text).toBe('select * from users where email = $1 and id = $2');
    expect(q.values).toEqual(["x' or 1=1 --", 5]);
  });

  it('flattens nested fragments with continuous numbering', () => {
    const inner = sql`a = ${1}`;
    const q = sql`select ${2} where ${inner} and b = ${3}`.compile();
    expect(q.text).toBe('select $1 where a = $2 and b = $3');
    expect(q.values).toEqual([2, 1, 3]);
  });

  it('joins and ands fragments', () => {
    const q = sql`where ${sql.and([sql`a = ${1}`, null, false, sql`b = ${2}`])}`.compile();
    expect(q.text).toBe('where (a = $1) and (b = $2)');
    expect(sql`${sql.and([])}`.compile().text).toBe('true');
    expect(sql.join([sql`${1}`, sql`${2}`]).compile().text).toBe('$1, $2');
  });

  it('turns undefined into null', () => {
    expect(sql`${undefined}`.compile().values).toEqual([null]);
  });
});
