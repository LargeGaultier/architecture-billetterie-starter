import type { PasswordVerifier } from '../../application/ports.js';
import { verifyPassword } from '../../passwords.js';

// Conserve le calcul scrypt du TP 3 pour un login inconnu, sans exposer ce détail au cas d'usage.
const dummyHash = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`;

export class ScryptPasswordVerifier implements PasswordVerifier {
  async verify(password: string, hash: string | null): Promise<boolean> {
    return verifyPassword(password, hash ?? dummyHash);
  }
}
