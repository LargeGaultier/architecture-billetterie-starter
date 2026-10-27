export type BusinessErrorCode = 'INVALID_INPUT' | 'AUTH_REQUIRED' | 'INVALID_CREDENTIALS'
  | 'EVENT_NOT_FOUND' | 'EVENT_CANCELLED' | 'SOLD_OUT' | 'RESERVATION_NOT_FOUND'
  | 'RESERVATION_FORBIDDEN' | 'RESERVATION_EXPIRED' | 'RESERVATION_CLOSED';

export class BusinessError extends Error {
  constructor(public readonly code: BusinessErrorCode, message: string) { super(message); }
}
