export interface TimeLeft {
  totalMinutes: number;
  days: number;
  hours: number;
  minutes: number;
  expired: boolean;
}

export function timeLeft(expiresAt: string | Date, now: Date = new Date()): TimeLeft {
  const difference = new Date(expiresAt).getTime() - now.getTime();
  const totalMinutes = Math.max(0, Math.ceil(difference / 60000));
  return {
    totalMinutes,
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
    expired: difference < 0,
  };
}

export function formatTimeLeft(left: TimeLeft): string {
  if (left.expired) return 'expired';
  if (left.days > 0) return `${left.days} day${left.days === 1 ? '' : 's'} ${left.hours} hour${left.hours === 1 ? '' : 's'}`;
  if (left.hours > 0) return `${left.hours} hour${left.hours === 1 ? '' : 's'} ${left.minutes} minute${left.minutes === 1 ? '' : 's'}`;
  return `${left.minutes} minute${left.minutes === 1 ? '' : 's'}`;
}

export function isExpiringSoon(expiresAt: string | Date, now: Date = new Date()): boolean {
  const difference = new Date(expiresAt).getTime() - now.getTime();
  return difference <= 12 * 60 * 60 * 1000;
}

export function getRoomExpiry(lastActiveAt: string, expiryDays: number): string {
  return new Date(new Date(lastActiveAt).getTime() + expiryDays * 86400000).toISOString();
}
