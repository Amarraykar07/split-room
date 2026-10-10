import { formatTimeLeft, getRoomExpiry, isExpiringSoon, timeLeft } from './expiry';

describe('expiry helpers', () => {
  const now = new Date('2026-10-11T00:00:00.000Z');

  test.each([
    [0, '0 minutes'],
    [59, '59 minutes'],
    [60, '1 hour 0 minutes'],
    [12 * 60, '12 hours 0 minutes'],
    [48 * 60, '2 days 0 hours'],
  ])('formats %i minutes', (minutes, expected) => {
    expect(formatTimeLeft(timeLeft(new Date(now.getTime() + minutes * 60000), now))).toBe(expected);
  });

  test('handles expired dates and soon threshold', () => {
    expect(timeLeft('2026-10-10T23:59:00.000Z', now).expired).toBe(true);
    expect(isExpiringSoon(new Date(now.getTime() + 12 * 60 * 60000), now)).toBe(true);
    expect(isExpiringSoon(new Date(now.getTime() + 12 * 60 * 60000 + 1), now)).toBe(false);
  });

  test('supports seven-day rooms and timezone-safe ISO dates', () => {
    const lastActive = '2026-10-10T12:00:00.000Z';
    expect(getRoomExpiry(lastActive, 7)).toBe('2026-10-17T12:00:00.000Z');
    expect(timeLeft('2026-10-13T00:00:00+05:30', now).days).toBe(1);
  });
});
