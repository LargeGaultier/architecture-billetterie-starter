import type { BusinessErrorCode } from '../../domain/BusinessError.js';

export const businessErrorStatus: Record<BusinessErrorCode, number> = {
  INVALID_INPUT: 400,
  AUTH_REQUIRED: 401,
  INVALID_CREDENTIALS: 401,
  EVENT_NOT_FOUND: 404,
  EVENT_CANCELLED: 409,
  SOLD_OUT: 409,
  RESERVATION_NOT_FOUND: 404,
  RESERVATION_FORBIDDEN: 403,
  RESERVATION_EXPIRED: 410,
  RESERVATION_CLOSED: 409,
};
