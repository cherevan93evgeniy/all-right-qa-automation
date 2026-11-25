import { randomUUID } from 'node:crypto';
import type { Booking, BookingDates } from '../api/booking.types';

type BookingOverrides = Omit<Partial<Booking>, 'bookingdates'> & {
  bookingdates?: Partial<BookingDates>;
};

export function createBooking(overrides: BookingOverrides = {}): Booking {
  const {
    firstname = 'Alex',
    lastname = `QA-${randomUUID()}`,
    totalprice = 125,
    depositpaid = true,
    bookingdates: { checkin = '2027-06-10', checkout = '2027-06-14' } = {},
    additionalneeds = 'Breakfast',
  } = overrides;

  if (firstname.trim() === '' || lastname.trim() === '') {
    throw new RangeError('Booking names must be nonempty');
  }
  if (!Number.isFinite(totalprice) || totalprice <= 0) {
    throw new RangeError('Booking price must be a finite positive number');
  }
  if (!isDate(checkin) || !isDate(checkout) || checkout <= checkin) {
    throw new RangeError('Booking dates must be valid YYYY-MM-DD dates with checkout after checkin');
  }

  return { firstname, lastname, totalprice, depositpaid, bookingdates: { checkin, checkout }, additionalneeds };
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
