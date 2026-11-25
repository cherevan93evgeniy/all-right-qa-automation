import assert from 'node:assert/strict';
import { expect, type APIResponse } from '@playwright/test';
import type { Booking, CreateBookingResponse } from '../../../api/booking.types';
import { jsonMediaType, plainTextMediaType } from '../../../api/response-media-types';

export function expectJsonSuccess(response: APIResponse): void {
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(jsonMediaType);
}

export async function expectPlainText(
  response: APIResponse,
  status: number,
  body: string,
): Promise<void> {
  expect(response.status()).toBe(status);
  expect(response.headers()['content-type']).toMatch(plainTextMediaType);
  expect(await response.text()).toBe(body);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function assertCreatedBooking(
  response: APIResponse,
  expected: Booking,
  register: (id: number) => void,
): Promise<CreateBookingResponse['bookingid']> {
  const body: unknown = await response.json().catch((error: unknown) => {
    if (error instanceof SyntaxError) {
      return undefined;
    }
    throw error;
  });
  const id = isObject(body) ? body.bookingid : undefined;
  const validId = typeof id === 'number' && Number.isSafeInteger(id) && id > 0 ? id : undefined;
  if (validId !== undefined) {
    register(validId);
  }

  expectJsonSuccess(response);
  assert(isObject(body), 'Create response must be a JSON object');
  assert(validId !== undefined, 'Create response must contain a positive integer bookingid');
  assertBooking(body.booking, expected);
  return validId;
}

export function assertBooking(body: unknown, expected: Booking): asserts body is Booking {
  assert(isObject(body), 'Booking must be a JSON object');
  assert(typeof body.firstname === 'string', 'firstname must be a string');
  assert(typeof body.lastname === 'string', 'lastname must be a string');
  assert(typeof body.totalprice === 'number' && Number.isFinite(body.totalprice), 'totalprice must be a finite number');
  assert(typeof body.depositpaid === 'boolean', 'depositpaid must be a boolean');
  assert(isObject(body.bookingdates), 'bookingdates must be a JSON object');
  assert(typeof body.bookingdates.checkin === 'string', 'checkin must be a string');
  assert(typeof body.bookingdates.checkout === 'string', 'checkout must be a string');
  if (expected.additionalneeds !== undefined) {
    assert(typeof body.additionalneeds === 'string', 'additionalneeds must be a string');
  }
  expect(body, 'Booking must match the submitted payload').toStrictEqual(expected);
}
