import { test as base, type TestInfo } from '@playwright/test';
import { BookingClient } from '../api/booking.client';
import { jsonMediaType, plainTextMediaType } from '../api/response-media-types';
import { bookingCredentials } from '../test-data/booking.credentials';

type GetAuthToken = () => Promise<string>;

type OwnedBooking = {
  id: number;
  lastname: string;
  token?: string;
};

type ApiFixtures = {
  bookingClient: BookingClient;
  getAuthToken: GetAuthToken;
  bookingCleanup: { register(id: number, lastname: string, token?: string): void };
};

export const test = base.extend<ApiFixtures>({
  bookingClient: async ({ request }, use) => {
    await use(new BookingClient(request));
  },
  getAuthToken: async ({ bookingClient }, use) => {
    let token: Promise<string> | undefined;
    await use(() => (token ??= authenticate(bookingClient)));
  },
  bookingCleanup: async ({ bookingClient, getAuthToken }, use, testInfo) => {
    const bookings = new Map<number, OwnedBooking>();

    try {
      await use({
        register(id, lastname, token) {
          if (!Number.isSafeInteger(id) || id <= 0 || lastname.trim() === '') {
            throw new Error('Cleanup requires a positive integer booking ID and a nonempty ownership marker');
          }
          const previous = bookings.get(id);
          if (previous && previous.lastname !== lastname) {
            throw new Error(`Booking ${id} was registered with a different ownership marker`);
          }
          bookings.set(id, { id, lastname, token: token ?? previous?.token });
        },
      });
    } finally {
      const failures: string[] = [];
      for (const booking of bookings.values()) {
        const failure = await cleanBooking(bookingClient, getAuthToken, booking, testInfo);
        if (failure) {
          failures.push(`Booking ${booking.id}: ${failure}`);
        }
      }
      if (failures.length > 0) {
        throw new Error(`Booking cleanup failed:\n${failures.join('\n')}`);
      }
    }
  },
});

async function authenticate(client: BookingClient): Promise<string> {
  const response = await client.authenticate(bookingCredentials).catch(() => {
    throw new Error('The authentication request failed');
  });
  if (response.status() !== 200) {
    throw new Error(`Authentication returned HTTP ${response.status()} (expected 200)`);
  }

  if (!jsonMediaType.test(response.headers()['content-type'] ?? '')) {
    throw new Error('Authentication response must use the application/json media type');
  }

  const body: unknown = await response.json().catch(() => {
    throw new Error('Authentication returned invalid JSON');
  });
  if (
    !body || typeof body !== 'object' || !('token' in body) ||
    typeof body.token !== 'string' || body.token.trim() === ''
  ) {
    throw new Error('Authentication response did not contain a nonempty string token');
  }
  return body.token;
}

async function cleanBooking(
  client: BookingClient,
  getAuthToken: GetAuthToken,
  { id, lastname, token }: OwnedBooking,
  testInfo: TestInfo,
): Promise<string | undefined> {
  let operation = 'Ownership GET';

  try {
    const initial = await checkOwnership('Ownership GET');
    if (initial !== 'owned') {
      return initial.failure;
    }

    let cleanupToken = token;
    if (cleanupToken === undefined) {
      operation = 'Cleanup authentication';
      cleanupToken = await getAuthToken();

      const recheck = await checkOwnership('Ownership recheck after authentication');
      if (recheck !== 'owned') {
        return recheck.failure;
      }
    }

    operation = 'DELETE';
    const deletion = await client.deleteBooking(id, cleanupToken);
    if (deletion.status() !== 201) {
      return `DELETE returned HTTP ${deletion.status()} (expected 201)`;
    }
    if (!plainTextMediaType.test(deletion.headers()['content-type'] ?? '')) {
      return 'DELETE response must use the text/plain media type';
    }
    if (await deletion.text() !== 'Created') {
      return 'DELETE returned an unexpected body (expected Created)';
    }

    operation = 'Absence GET';
    const missing = await client.getBooking(id);
    if (missing.status() !== 404) {
      return `Absence GET returned HTTP ${missing.status()} (expected 404)`;
    }
    if (!plainTextMediaType.test(missing.headers()['content-type'] ?? '')) {
      return 'Absence GET response must use the text/plain media type';
    }
    if (await missing.text() !== 'Not Found') {
      return 'Absence GET returned an unexpected body (expected Not Found)';
    }
    testInfo.annotations.push({ type: 'booking-cleanup', description: `Booking ${id} deleted (201), absence confirmed (404)` });
  } catch {
    return `${operation} failed while sending the request or reading the response`;
  }

  async function checkOwnership(stage: string): Promise<'owned' | { failure?: string }> {
    operation = stage;
    const current = await client.getBooking(id);
    if (current.status() === 404) {
      testInfo.annotations.push({ type: 'booking-cleanup', description: `Booking ${id} already absent (404) at ${stage}` });
      return {};
    }
    if (current.status() !== 200) {
      return { failure: `${stage} returned HTTP ${current.status()} (expected 200 or 404)` };
    }

    operation = `${stage} response parsing`;
    const body: unknown = await current.json();
    if (!body || typeof body !== 'object' || !Object.hasOwn(body, 'lastname') ||
        !('lastname' in body) || body.lastname !== lastname) {
      return { failure: `${stage}: ownership marker mismatch. DELETE was skipped.` };
    }
    return 'owned';
  }
}

export { expect } from '@playwright/test';
