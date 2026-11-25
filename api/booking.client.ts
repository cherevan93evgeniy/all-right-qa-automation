import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { AuthCredentials, Booking } from './booking.types';

export class BookingClient {
  constructor(private readonly request: APIRequestContext) {}

  authenticate(credentials: AuthCredentials): Promise<APIResponse> {
    return this.request.post('/auth', {
      data: credentials,
      headers: this.headers(),
      failOnStatusCode: false,
      maxRedirects: 0,
    });
  }

  createBooking(data: Booking): Promise<APIResponse> {
    return this.request.post('/booking', {
      data,
      headers: this.headers(),
      failOnStatusCode: false,
      maxRedirects: 0,
    });
  }

  getBooking(id: number): Promise<APIResponse> {
    return this.request.get(`/booking/${id}`, {
      headers: this.headers(),
      failOnStatusCode: false,
      maxRedirects: 0,
    });
  }

  updateBooking(id: number, data: Booking, token?: string): Promise<APIResponse> {
    return this.request.put(`/booking/${id}`, {
      data,
      headers: this.headers(token),
      failOnStatusCode: false,
      maxRedirects: 0,
    });
  }

  deleteBooking(id: number, token?: string): Promise<APIResponse> {
    return this.request.delete(`/booking/${id}`, {
      headers: this.headers(token),
      failOnStatusCode: false,
      maxRedirects: 0,
    });
  }

  private headers(token?: string): Record<string, string> {
    return {
      Accept: 'application/json',
      ...(token === undefined ? {} : { Cookie: `token=${token}` }),
    };
  }
}
