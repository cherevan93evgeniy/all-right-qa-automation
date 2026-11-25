import assert from 'node:assert/strict';
import type { AuthCredentials, AuthSuccessResponse, BookingDates } from '../../api/booking.types';
import { expect, test } from '../../fixtures/api.fixture';
import { bookingCredentials } from '../../test-data/booking.credentials';
import { createBooking } from '../../test-data/booking.factory';
import { assertBooking, assertCreatedBooking, expectJsonSuccess, expectPlainText, isObject } from './helpers/booking.assertions';

// Request traces can include authentication response bodies and cookie headers.
test.use({ trace: 'off' });

test('API-01 — Complete booking lifecycle', async ({ bookingClient, bookingCleanup }) => {
  const credentials: AuthCredentials = bookingCredentials;
  const { token } = await test.step('Authenticate with valid credentials', async (): Promise<AuthSuccessResponse> => {
    const response = await bookingClient.authenticate(credentials);
    expectJsonSuccess(response);
    const body: unknown = await response.json().catch((error: unknown) => {
      if (error instanceof SyntaxError) {
        throw new Error('Authentication response must be valid JSON');
      }
      throw error;
    });
    assert(isObject(body), 'Authentication response must be an object');
    assert(Object.hasOwn(body, 'token'), 'Authentication response must contain a token');
    assert(typeof body.token === 'string' && body.token.trim() !== '', 'Token must be a nonempty string');
    expect(Object.hasOwn(body, 'reason'), 'Successful authentication must omit the failure reason').toBe(false);
    return { token: body.token };
  });

  const original = createBooking();
  const bookingId = await test.step('Create a unique booking', async () => {
    const response = await bookingClient.createBooking(original);
    return assertCreatedBooking(response, original, (id) => bookingCleanup.register(id, original.lastname, token));
  });

  await test.step('Retrieve the original booking and verify persistence', async () => {
    const response = await bookingClient.getBooking(bookingId);
    expectJsonSuccess(response);
    const body: unknown = await response.json();
    assertBooking(body, original);
  });

  const updated = await test.step('Verify ownership and update the booking', async () => {
    const bookingdates: BookingDates = { ...original.bookingdates, checkout: '2027-06-18' };
    const replacement = createBooking({
      ...original,
      firstname: 'Morgan',
      totalprice: 219,
      depositpaid: !original.depositpaid,
      bookingdates,
      additionalneeds: 'Late arrival',
    });

    await verifyOwnership();
    const response = await bookingClient.updateBooking(bookingId, replacement, token).catch(redactRequestError);
    expectJsonSuccess(response);
    const body: unknown = await response.json();
    assertBooking(body, replacement);
    return replacement;
  });

  await test.step('Retrieve the updated booking and verify persistence', async () => {
    const response = await bookingClient.getBooking(bookingId);
    expectJsonSuccess(response);
    const body: unknown = await response.json();
    assertBooking(body, updated);
    expect(body.firstname).not.toBe(original.firstname);
    expect(body.totalprice).not.toBe(original.totalprice);
    expect(body.depositpaid).not.toBe(original.depositpaid);
    expect(body.bookingdates.checkout).not.toBe(original.bookingdates.checkout);
    expect(body.additionalneeds).not.toBe(original.additionalneeds);
    expect(body.lastname).toBe(original.lastname);
  });

  await test.step('Verify ownership and delete the booking', async () => {
    await verifyOwnership();
    const response = await bookingClient.deleteBooking(bookingId, token).catch(redactRequestError);
    await expectPlainText(response, 201, 'Created');
  });

  await test.step('Verify that the deleted booking is absent', async () => {
    const response = await bookingClient.getBooking(bookingId);
    await expectPlainText(response, 404, 'Not Found');
  });

  async function verifyOwnership(): Promise<void> {
    const response = await bookingClient.getBooking(bookingId);
    expectJsonSuccess(response);
    const body: unknown = await response.json();
    assert(isObject(body), 'Ownership response must be a JSON object');
    expect(body.lastname, 'The booking must still belong to this test').toBe(original.lastname);
  }

  function redactRequestError(error: unknown): never {
    if (error instanceof Error && error.message.includes(token)) {
      throw new Error(error.message.replaceAll(token, '[redacted]'));
    }
    throw error;
  }
});
