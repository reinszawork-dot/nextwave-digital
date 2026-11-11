/**
 * Real testimonials only. The Testimonials section stays hidden while this list is empty,
 * so nothing invented is ever shown. Add an entry only with the person's permission.
 *
 * Example:
 * { quote: 'Wisely finally made payday-to-payday budgeting click for me.', name: 'Thandi M.', role: 'Wisely user', product: 'wisely' }
 */
import type { ProductId } from './products';

export interface Testimonial {
  quote: string;
  name: string;
  role?: string;
  product?: ProductId;
}

export const testimonials: Testimonial[] = [];
