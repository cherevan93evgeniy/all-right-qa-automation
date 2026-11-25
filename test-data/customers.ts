import type { CustomerInfo } from '../pages/checkout.page';

export const validCustomer = {
  firstName: 'Demo',
  lastName: 'Customer',
  postalCode: '01234',
} as const satisfies CustomerInfo;
