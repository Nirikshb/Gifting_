const DECIMAL_PLACES = 2;
const CENTS = 100n;

/** Matches amounts with at most two decimal places (PostgreSQL numeric(10,2)). */
const MONEY_RE = /^(-?\d+)(?:\.(\d{1,2}))?$/;

function toCents(amount: string): bigint {
  const match = amount.trim().match(MONEY_RE);
  if (!match) {
    throw new Error(`Invalid money value: ${amount}`);
  }

  const [, wholePart, fractionPart = ''] = match;
  const negative = wholePart.startsWith('-');
  const whole = BigInt(negative ? wholePart.slice(1) : wholePart);
  const fraction = BigInt(fractionPart.padEnd(DECIMAL_PLACES, '0'));

  const cents = whole * CENTS + fraction;
  return negative ? -cents : cents;
}

function formatCents(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const whole = absolute / CENTS;
  const fraction = (absolute % CENTS)
    .toString()
    .padStart(DECIMAL_PLACES, '0');

  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

export function multiplyMoney(unitPrice: string, quantity: number): string {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Quantity must be a positive integer');
  }

  return formatCents(toCents(unitPrice) * BigInt(quantity));
}

export function addMoney(...amounts: string[]): string {
  const total = amounts.reduce((sum, amount) => sum + toCents(amount), 0n);
  return formatCents(total);
}
