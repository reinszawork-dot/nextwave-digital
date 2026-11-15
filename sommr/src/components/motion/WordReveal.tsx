import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

/**
 * Splits a headline into words that rise into place one after another, masked
 * like a line of type being set. Works in server components; nested elements
 * such as <em> keep their styling.
 *
 *   <h1><WordReveal>Make this summer <em>count</em>.</WordReveal></h1>
 *   trigger="scroll" waits until the headline scrolls into view.
 */
function split(node: ReactNode, counter: { n: number }, key: string): ReactNode {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
      .split(/(\s+)/)
      .map((part, i) => {
        if (!part) return null;
        if (/^\s+$/.test(part)) return part;
        const w = counter.n++;
        return (
          <span className="w" key={`${key}-${i}`}>
            <span className="wi" style={{ ['--w' as string]: w }}>
              {part}
            </span>
          </span>
        );
      });
  }
  if (Array.isArray(node)) return node.map((child, i) => split(child, counter, `${key}.${i}`));
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return cloneElement(el, { key: el.key ?? key }, split(Children.toArray(el.props.children), counter, `${key}c`));
  }
  return node;
}

export function WordReveal({
  children,
  trigger = 'load',
  delay = 60,
  className = '',
}: {
  children: ReactNode;
  trigger?: 'load' | 'scroll';
  delay?: number;
  className?: string;
}) {
  return (
    <span className={`words ${className}`} data-trigger={trigger} style={{ ['--words-delay' as string]: `${delay}ms` }}>
      {split(children, { n: 0 }, 'w')}
    </span>
  );
}
