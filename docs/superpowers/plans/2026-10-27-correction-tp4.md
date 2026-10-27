# Correction TP 4 — refactorisation Clean

**Objectif :** branche `correction/tp4` issue de `correction/tp3` (`0a22ed1`), mêmes contrats et fonctionnalités, toutes les décisions testables sans base ni serveur.
**Sujet :** [TP 4 dans Notion](https://www.notion.so/3efa4f0ae4ab813497bce09a723ec0db), consulté le 27 octobre 2026.
**Référence vérifiée :** 24 tests réussis avant modification.

## Organisation choisie

`domain` contient modèles, règles et erreurs sans HTTP. `application` contient les ports et huit cas d'usage : checkout, réservation, détail privé, connexion, utilisateur courant, déconnexion, catalogue et détail d'événement. `adapters` contient HTTP, PostgreSQL, sessions mémoire, scrypt, paiement simulé et outils système. `bootstrap` assemble ces réalisations ; `src/app.ts` reste l'entrée compatible des tests et du serveur.

Les tests HTTP/front/migration du TP 3 restent inchangés. Les anciennes entrées `types.ts` et `integrations/PaymentSimulator.ts` peuvent rester des réexports pour leur compatibilité ; les décisions ne restent pas dans les anciens services.

## Passes et vérifications

- [x] **Checkout** : écrire les tests en mémoire (identité, propriétaire, états, résultats et absence d'effets), constater leur échec avant extraction ; introduire modèles, erreurs, ports et règles ; brancher le cas d'usage à la place de l'ancien checkout ; vérifier les 24 tests et committer.
- [x] **Réservations** : tests en mémoire de création, annulation, complet, auteur, expiration et consultation privée ; extraire `ReservePlace` et `GetReservation`, garder l'ordre des effets ; vérifier toute la suite et committer.
- [x] **Comptes et sessions** : tests de connexion correcte/refusée, rotation, session absente/expirée, compte disparu et déconnexion ; extraire `Login`, `GetCurrentUser`, `Logout`, les ports et adaptateurs ; déplacer cookies et traduction HTTP à la périphérie ; vérifier toute la suite et committer.
- [x] **Catalogue et assemblage** : tests de consultation publique et expiration ; extraire `ListEvents`, `GetEvent` ; finaliser adaptateurs et composition, retirer les anciens services ; vérifier les imports réels, la compilation et les tests ; committer.
- [x] **Livraison** : note de correction avec inventaire, schémas avant/après, coût et limites ; revue indépendante puis corrections éventuelles avec régression rouge/verte ; publier et vérifier l'ascendance GitHub.

## Points de revue

401/403 avant effet ; même priorité des erreurs ; expiration conservée sur les lectures ; aucune dépendance technique ni statut HTTP dans domaine/application ; sessions à expiration fixe avec horloge contrôlable ; mots de passe/hashes absents des réponses ; faux adaptateurs sans Fastify ni PostgreSQL ; pas de CQRS ni correction de concurrence anticipée.

## Ajustement demandé après revue utilisateur

- [x] Un port par fichier dans `application/ports/`, avec imports directs et suppression de `ports.ts`.
- [x] Un modèle ou état par fichier dans `domain/models/`, avec `User.ts`, `UserAccount.ts` et `Session.ts` explicites ; suppression de `models.ts` et conservation des anciens alias uniquement dans `src/types.ts`.
- [x] Compilation, 43 tests en mémoire et contrôle des dépendances après réorganisation.
- [x] Mise à jour documentaire, suite complète Docker (78 tests), revue et publication sur la même branche `correction/tp4`.
