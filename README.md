# Billetterie — socle du cours d'architecture

Cette branche contient la [correction du TP 7 — trois microservices](docs/corrections/tp7.md), issue de `correction/tp6` au commit `b605fc1`. Les corrections [TP 2](docs/corrections/tp2.md), [TP 3](docs/corrections/tp3.md), [TP 4](docs/corrections/tp4.md), [TP 5](docs/corrections/tp5.md) et [TP 6](docs/corrections/tp6.md) restent disponibles sur leurs branches.

Une billetterie fictive pour étudier l'architecture à partir d'un cas métier : **trois services TypeScript/Node.js — Identité, Billetterie et Paiement — avec leurs bases PostgreSQL privées**. Une gateway conserve l'interface web et les contrats HTTP. Chaque service garde ses ports, modèles, commandes et requêtes.

## Démarrer

Prérequis : Docker Desktop ou Docker Engine avec Compose. Aucun compte de paiement ni installation locale de Node.js n'est nécessaire.

```sh
docker compose up --build -d --wait
```

Ouvrir [http://localhost:3000](http://localhost:3000). Pour suivre le démarrage :

```sh
docker compose ps
docker compose logs -f gateway identity ticketing payments
```

L'application démarre avec trois événements fictifs, dont un événement d'une seule place pour les expériences de concurrence. Les données sont conservées dans trois volumes Docker privés entre deux démarrages. Les volumes TP 6 restent intacts ; cette branche initialise une nouvelle démonstration.

## Parcours de démonstration

1. Consulter le catalogue public, puis se connecter avec un compte fictif ci-dessous.
2. Réserver une place. La réservation est `PENDING` et retient la place pendant 15 minutes par défaut.
3. Déclencher le paiement simulé : `success` confirme, `failure` refuse et libère la place, `slow` laisse le résultat en attente.
4. Copier l'identifiant de réservation et consulter son état dans le panneau de suivi.

Le scénario `slow` attend 2 secondes par défaut. Il ne contacte aucun prestataire et ne débite personne. Une réservation en attente expirée libère sa place lors d'une prochaine requête. Les états et leurs limites sont décrits dans [l'architecture initiale](docs/architecture-initiale.md).

### Comptes fictifs du TP 3

| Login | Mot de passe public de démonstration |
| --- | --- |
| `alice` | `Alice-demo-2027!` |
| `bob` | `Bob-demo-2027!` |

L'initialisation des comptes s'exécute dans la base privée Identité au démarrage. Les mots de passe sont stockés sous forme de hashes scrypt avec un sel aléatoire distinct. Une nouvelle exécution conserve les comptes et leurs hashes.

La session opaque dure 30 minutes, sans prolongation à la lecture. Elle est conservée en mémoire dans Identité : redémarrer ce service déconnecte les utilisateurs et plusieurs instances ne partagent pas les sessions. Le cookie est `HttpOnly`, `SameSite=Lax`, `Path=/`. Pour un déploiement HTTPS, définir `AUTH_COOKIE_SECURE=true` ; laisser `false` pour le HTTP local.

Une réservation conserve le champ `customerRef`, mais le serveur le remplit avec l'identifiant du compte de la session. Un auteur envoyé par le navigateur est ignoré. Lors du premier passage au TP 3, les références historiques reçoivent le préfixe `legacy:` : une ancienne référence libre identique à `user-alice` ne devient ainsi pas une preuve de propriété. Les passages suivants préservent les nouveaux auteurs authentifiés.

## Commandes d'atelier

| Action | Commande |
| --- | --- |
| Lancer les tests ordinaires dans un conteneur | `docker compose --profile test run --build --rm test` |
| Tester les décisions sans base ni serveur (Node.js et `npm ci`) | `npm run test:unit` |
| Vérifier les frontières, les imports Clean/CQRS et la propriété des tables | `npm run check:architecture` |
| Observer le défaut de concurrence initial | `docker compose --profile test run --rm test sh -c 'npm run migrate:test && npm run test:challenge'` |
| Mesurer la consultation pendant 10 secondes | `docker compose --profile load run --build --rm load` |
| Vérifier achat, pannes et redémarrages (application démarrée) | `npm run verify:tp7` |
| Arrêter les conteneurs en gardant les données | `docker compose down` |
| Réinitialiser la démonstration locale | `docker compose --profile test down -v` puis `docker compose up --build -d` |

Le **test de concurrence échoue volontairement dans cette correction**. Il crée deux demandes simultanées pour une seule place ; il devient un test de régression une fois la garantie implémentée. Il utilise les trois bases du profil de test, séparées des volumes de démonstration. Les tests ordinaires réinitialisent les réservations et tentatives de test avant chaque scénario.

Pour modifier la durée ou la pression de charge, définir les variables `LOAD_SECONDS`, `LOAD_CONCURRENCY` ou `EVENT_ID` avant la commande Compose. Les résultats donnent le nombre de requêtes, les erreurs, le débit et les latences p50/p95. Les chiffres dépendent de la machine locale et sont destinés à comparer deux versions dans des conditions similaires.

## API

| Méthode et route | Usage |
| --- | --- |
| `GET /api/events` | Liste et places affichées |
| `GET /api/events/:id` | Détail d'un événement |
| `POST /api/auth/login` | Connexion avec `{ "login": "alice", "password": "Alice-demo-2027!" }`, retourne `{ "user": { "id": "user-alice", "login": "alice" } }` et le cookie |
| `GET /api/auth/me` | Compte de la session courante, même réponse publique |
| `POST /api/auth/logout` | Invalide la session, efface le cookie, retourne `204` |
| `POST /api/reservations` | Connecté : réserver avec `{ "eventId": "festival-lumieres" }` |
| `GET /api/reservations/:id` | Propriétaire connecté : état et tentatives de paiement |
| `POST /api/reservations/:id/checkout` | Propriétaire connecté : paiement fictif avec `{ "scenario": "success" }`, `failure` ou `slow` |
| `GET /health` | Santé locale de la gateway ; chaque service vérifie sa base sur son propre `/health` |

Les erreurs JSON ont la forme `{ "error": { "code": "…", "message": "…" } }`. Sans session valide : `401 AUTH_REQUIRED`. Connexion refusée : `401 INVALID_CREDENTIALS`. Accès à une réservation étrangère : `403 RESERVATION_FORBIDDEN`. La réservation peut renvoyer `400` (entrée invalide), `404` (événement absent) ou `409` (`EVENT_CANCELLED` ou `SOLD_OUT`). Le checkout peut également renvoyer `410` (réservation expirée) ou `409 RESERVATION_CLOSED`. Une erreur technique retourne `503`.

## Progression pédagogique

Commencer par découvrir les objets et parcours métier **avant** d'utiliser les dossiers du code comme modèle de découpage. Puis faire évoluer le monolithe par étapes : N-Layer, Clean Architecture, CQRS et vertical slices. Comparer ensuite plusieurs découpages fonctionnels, décider et justifier une extraction en **trois services**, puis travailler les problèmes de concurrence, transactions, pannes et scalabilité. Cette suite sert à faire apparaître de nouvelles contraintes ; aucun style n'est présenté comme supérieur en toute situation.

La [méthode de découpage](docs/ateliers/decoupage-fonctionnel.md) guide l'enquête sans nommer les services attendus. Le [modèle d'ADR](docs/adr-template.md) et les [règles d'usage de l'IA](docs/usage-ia.md) accompagnent la justification des décisions.

## Structure du TP 7

```text
src/services/{identity,ticketing,payments}.ts  un processus par service métier
src/server.ts                              gateway technique
src/modules/identity/                      comptes, sessions, HTTP, SQL et tests
src/modules/ticketing/                     catalogue, réservations, achat et clients HTTP
src/modules/payments/                      tentatives, simulation, HTTP, SQL et tests
  application/{commands,queries,dto,ports}/ un fichier par intention, DTO et port
  domain/models/                           un fichier par modèle
  adapters/                                implémentations locales
  bootstrap/                               assemblage du service
src/shared/                                petits contrats et outils techniques
db/{identity,ticketing,payments}/            données privées par service
public/                                    interface de connexion conservée
tests/contracts/                           contrats HTTP avec vrais serveurs locaux
tests/helpers/                             parcours sur trois bases et HTTP
scripts/verify-tp7.mjs                      achat, refus, pannes et redémarrages
```

Chaque service assemble ses propres ports et modèles. Billetterie vérifie le cookie auprès d'Identité et transmet seulement l'identifiant au handler d'achat ; les auteurs et en-têtes forgés du navigateur sont ignorés. Paiement possède les tentatives et leur simulation, sans accès aux réservations. Les imports directs entre services sont interdits.

Le modèle utilisateur reste explicite dans [Identité](src/modules/identity/domain/models/) : `User`, `UserAccount` et `Session`, dans leurs fichiers respectifs. Les ports sont dans `application/ports/` de chaque module. La gateway ne connaît aucune base ni classe métier.

Les requêtes restent sans écriture. Les routes Billetterie orchestrent la maintenance explicite ; sur le détail privé, l'autorisation précède l'expiration et l'historique. La session opaque reste en mémoire dans Identité : son redémarrage déconnecte les utilisateurs.

La suite compte **135 tests ordinaires**, dont **60 tests en mémoire**, **17 contrats HTTP**, **12 tests architecturaux** et **2 tests d'isolation/migrations privées**. Les scénarios antérieurs sont conservés et branchés sur le réseau et les bases propriétaires ; un test protège aussi les UUID majuscules. Le défi de concurrence reste volontairement séparé pour le TP 8.

Voir [la correction TP 7](docs/corrections/tp7.md), [ADR 1 — frontières](docs/adr/001-tp7-frontieres-metier.md) et [ADR 2 — stack/données/échanges](docs/adr/002-tp7-stack-donnees-echanges.md) pour les comparaisons, C4, séquence, contrats et preuves.

Les pannes sont maintenant visibles : Paiement coupé laisse le catalogue et la réservation accessibles, mais l'achat et l'historique complet répondent 503. Identité coupée laisse le catalogue public accessible ; une session à vérifier reçoit 503. Les attentes HTTP sont bornées et aucun achat n'est relancé automatiquement après une coupure.
