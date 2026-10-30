import { BusinessError } from '../../../shared/domain/BusinessError.js';
import type { PaymentScenario } from './models/PaymentScenario.js';
export function paymentRequest(reservationId: string, scenario: string): PaymentScenario {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reservationId) || !['success', 'failure', 'slow'].includes(scenario)) {
    throw new BusinessError('INVALID_INPUT', 'Demande de paiement invalide.');
  }
  return scenario as PaymentScenario;
}
