const MONEY_SCALE = 2;

function toCents(amount: string): bigint {
  const normalized = amount.trim();
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`Invalid money value: ${amount}`);
  }

  const [wholePart, fractionPart = ''] = normalized.split('.');
  const fraction = fractionPart.padEnd(MONEY_SCALE, '0').slice(0, MONEY_SCALE);
  const sign = wholePart.startsWith('-') ? -1n : 1n;
  const whole = BigInt(wholePart.replace('-', '') || '0');
  const frac = BigInt(fraction || '0');

  return sign * (whole * 100n + frac);
}

function fromCents(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(MONEY_SCALE, '0');

  return `${negative ? '-' : ''}${whole.toString()}.${fraction}`;
}

export function multiplyMoney(unitPrice: string, quantity: number): string {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Quantity must be a positive integer');
  }

  const lineCents = toCents(unitPrice) * BigInt(quantity);
  return fromCents(lineCents);
}

export function addMoney(...amounts: string[]): string {
  const totalCents = amounts.reduce(
    (sum, amount) => sum + toCents(amount),
    0n,
  );
  return fromCents(totalCents);
}
