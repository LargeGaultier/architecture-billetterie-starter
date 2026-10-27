import type { User } from './User.js';

/** Compte utilisé pour vérifier les identifiants ; ne doit pas sortir dans l'API. */
export interface UserAccount extends User {
  passwordHash: string;
}
