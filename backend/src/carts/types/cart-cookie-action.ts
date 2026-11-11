export type CartCookieAction =
  | { type: 'none' }
  | { type: 'set'; token: string }
  | { type: 'clear' };
