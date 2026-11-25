import assert from 'node:assert/strict';
import type { APIRequestContext } from '@playwright/test';
import type { AuthFailureResponse } from '../../api/booking.types';
import { expect, test } from '../../fixtures/api.fixture';
import { invalidBookingCredentials, invalidBookingToken } from '../../test-data/booking.credentials';
import { createBooking } from '../../test-data/booking.factory';
import { assertBooking, assertCreatedBooking, expectJsonSuccess, expectPlainText, isObject } from './helpers/booking.assertions';

// Keep request tracing off because cleanup sends a valid token.
test.use({ trace: 'off', storageState: { cookies: [], origins: [] }, extraHTTPHeaders: {} });

test('API-02 — Authentication with invalid credentials', async ({ bookingClient, request }) => {
  await expectAnonymousContext(request);

  const response = await bookingClient.authenticate(invalidBookingCredentials);

  expectJsonSuccess(response);
  const body: unknown = await response.json();
  assert(isObject(body), 'Authentication response must be a JSON object');
  expect(Object.hasOwn(body, 'token'), 'Rejected authentication must omit the token').toBe(false);
  expect(typeof body.reason, 'Authentication failure reason must be a string').toBe('string');
  const expected: AuthFailureResponse = { reason: 'Bad credentials' };
  expect(body, 'Invalid credentials must return the exact failure body').toStrictEqual(expected);
});

test('API-03 — Update booking without authentication', async ({ bookingClient, bookingCleanup, request }) => {
  const original = createBooking();
  const created = await bookingClient.createBooking(original);
  const id = await assertCreatedBooking(created, original, (bookingId) =>
    bookingCleanup.register(bookingId, original.lastname),
  );
  const updated = createBooking({
    ...original,
    firstname: 'Morgan',
    totalprice: original.totalprice + 75,
    depositpaid: !original.depositpaid,
  });
  expect(updated).not.toStrictEqual(original);
  expect(updated.lastname).toBe(original.lastname);

  const before = await bookingClient.getBooking(id);
  expectJsonSuccess(before);
  assertBooking(await before.json(), original);
  await expectAnonymousContext(request);

  const denied = await bookingClient.updateBooking(id, updated);
  await expectPlainText(denied, 403, 'Forbidden');

  await test.step('Verify the rejected update left all booking fields unchanged', async () => {
    const stored = await bookingClient.getBooking(id);
    expectJsonSuccess(stored);
    assertBooking(await stored.json(), original);
  });
});

test('API-04 — Delete booking with invalid token', async ({ bookingClient, bookingCleanup, request }) => {
  const original = createBooking();
  const created = await bookingClient.createBooking(original);
  const id = await assertCreatedBooking(created, original, (bookingId) =>
    bookingCleanup.register(bookingId, original.lastname),
  );

  const before = await bookingClient.getBooking(id);
  expectJsonSuccess(before);
  assertBooking(await before.json(), original);
  await expectAnonymousContext(request);

  const denied = await bookingClient.deleteBooking(id, invalidBookingToken);
  await expectPlainText(denied, 403, 'Forbidden');

  await test.step('Verify the rejected delete left the booking present and unchanged', async () => {
    const stored = await bookingClient.getBooking(id);
    expectJsonSuccess(stored);
    assertBooking(await stored.json(), original);
  });
});

async function expectAnonymousContext(request: APIRequestContext): Promise<void> {
  expect((await request.storageState()).cookies.length, 'The request cookie jar must be empty').toBe(0);
  expect(test.info().project.use.httpCredentials === undefined, 'The project must omit HTTP credentials').toBe(true);
}
