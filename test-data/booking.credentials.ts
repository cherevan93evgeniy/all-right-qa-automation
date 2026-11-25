import type { AuthCredentials } from '../api/booking.types';

export const bookingCredentials = {
  username: 'admin',
  password: 'password123',
} as const satisfies AuthCredentials;

export const invalidBookingCredentials = {
  ...bookingCredentials,
  password: 'invalid-booker-password',
} as const satisfies AuthCredentials;

export const invalidBookingToken = 'invalid-booker-token';
