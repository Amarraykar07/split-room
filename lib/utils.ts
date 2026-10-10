/**
 * Generate a unique room code.
 * 8 characters, no ambiguous chars (0, O, 1, l, I).
 * Uses uppercase letters + digits except excluded chars.
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  for (let i = 0; i < 8; i++) {
    code += chars[array[i] % chars.length];
  }
  return code;
}

/**
 * Format a number as Indian Rupees.
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Build a UPI deep-link for payment.
 */
export function buildUPILink(params: {
  upiId: string;
  name: string;
  amount: number;
}): string {
  const { upiId, name, amount } = params;
  const pa = encodeURIComponent(upiId);
  const pn = encodeURIComponent(name);
  const am = amount.toFixed(2);
  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR`;
}

/**
 * Build WhatsApp share URL.
 */
export function buildWhatsAppUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function buildPaymentReminderMessage(params: {
  payerName: string;
  receiverName: string;
  roomName: string;
  amount: number;
  receiverUpiId?: string | null;
  roomLink: string;
}): string {
  const upi = params.receiverUpiId
    ? ` ${params.receiverName} ko UPI karo: ${params.receiverUpiId} .`
    : '';
  return `Hey ${params.payerName}! ${params.roomName} ke ${formatINR(params.amount)} baaki hai 🙏${upi} Hisaab yahan dekho: ${params.roomLink}`;
}

/**
 * Get localStorage item safely (SSR-safe).
 */
export function getLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Set localStorage item safely (SSR-safe).
 */
export function setLocalStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}
