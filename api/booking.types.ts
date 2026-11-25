export type AuthCredentials = {
  username: string;
  password: string;
};

export type AuthSuccessResponse = {
  token: string;
};

export type AuthFailureResponse = {
  reason: string;
};

export type BookingDates = {
  checkin: string;
  checkout: string;
};

export type Booking = {
  firstname: string;
  lastname: string;
  totalprice: number;
  depositpaid: boolean;
  bookingdates: BookingDates;
  additionalneeds?: string;
};

export type CreateBookingResponse = {
  bookingid: number;
  booking: Booking;
};
