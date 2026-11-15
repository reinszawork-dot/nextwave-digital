/**
 * A tiny, dependency-free SQL builder. Values are always sent as bind parameters
 * ($1, $2 …), never interpolated, so queries are safe from injection.
 *
 *   sql`select * from users where id = ${id}`
 *   sql`select * from places where ${sql.and([a, b])}`
 *   sql.raw('order by created_at desc')   // trusted, static text only
 */
export class SqlFragment {
  constructor(
    readonly strings: readonly string[],
    readonly values: readonly unknown[],
  ) {}

  /** Compile to `{ text, values }` with sequential $n placeholders. */
  compile(): { text: string; values: unknown[] } {
    const out: unknown[] = [];
    const text = this.build(out);
    return { text, values: out };
  }

  private build(out: unknown[]): string {
    let text = this.strings[0];
    for (let i = 0; i < this.values.length; i++) {
      const v = this.values[i];
      if (v instanceof SqlFragment) {
        text += v.build(out);
      } else {
        out.push(v === undefined ? null : v);
        text += `$${out.length}`;
      }
      text += this.strings[i + 1];
    }
    return text;
  }
}

export function sql(strings: TemplateStringsArray, ...values: unknown[]): SqlFragment {
  return new SqlFragment(strings, values);
}

/** Trusted, static SQL text (identifiers, keywords). Never pass user input. */
sql.raw = (text: string) => new SqlFragment([text], []);

sql.empty = new SqlFragment([''], []);

/** Join fragments with a separator. */
sql.join = (parts: SqlFragment[], separator = ', '): SqlFragment => {
  if (parts.length === 0) return sql.empty;
  const strings = [''];
  const values: unknown[] = [];
  parts.forEach((part, i) => {
    if (i > 0) strings[strings.length - 1] += separator;
    values.push(part);
    strings.push('');
  });
  return new SqlFragment(strings, values);
};

/** `a and b and c`, or `true` when empty. */
sql.and = (parts: (SqlFragment | false | null | undefined)[]): SqlFragment => {
  const real = parts.filter(Boolean) as SqlFragment[];
  if (real.length === 0) return sql.raw('true');
  return sql.join(real.map((p) => sql`(${p})`), ' and ');
};

export type Row = Record<string, unknown>;
