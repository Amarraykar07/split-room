import { buildPaymentReminderMessage, buildWhatsAppUrl } from './utils';

it('builds an escaped WhatsApp reminder with optional UPI', () => {
  const text = buildPaymentReminderMessage({
    payerName: 'A&B', receiverName: 'Bea', roomName: 'Goa Trip',
    amount: 12.5, receiverUpiId: 'bea@upi', roomLink: 'https://splitroom.in/room/ABC',
  });
  expect(text).toContain('A&B');
  expect(text).toContain('bea@upi');
  expect(buildWhatsAppUrl(text)).toContain(encodeURIComponent(text));
});
