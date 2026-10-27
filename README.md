# Billetterie — socle du cours d'architecture

Cette branche contient la [correction du TP 4 — Clean Architecture](docs/corrections/tp4.md), issue de `correction/tp3`. Les corrections [TP 2](docs/corrections/tp2.md) et [TP 3](docs/corrections/tp3.md) restent disponibles sur leurs branches et servent de référence avant refactorisation.

Une billetterie fictive pour étudier les choix d'architecture à partir d'un cas métier : **un monolithe TypeScript/Node.js avec domaine, cas d'usage et adaptateurs**, une interface web, PostgreSQL et un paiement simulé. Le TP 4 conserve les fonctionnalités, les contrats HTTP et le formulaire de connexion du TP 3.

## Démarrer

Prérequis : Docker Desktop ou Docker Engine avec Compose. Aucun compte de paiement ni installation locale de Node.js n'est nécessaire.

```sh
docker compose up --build -d
```

Ouvrir [http://localhost:3000](http://localhost:3000). Pour suivre le démarrage :

```sh
docker compose ps
docker compose logs -f app
```

L'application démarre avec trois événements fictifs, dont un événement d'une seule place pour les expériences de concurrence. Les données sont conservées dans un volume Docker entre deux démarrages.

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

La migration `002_users.sql` et l'initialisation des comptes sont exécutées au démarrage, y compris sur un volume existant. Les mots de passe sont stockés sous forme de hashes scrypt avec un sel aléatoire distinct. Une nouvelle exécution conserve les comptes et leurs hashes.

La session opaque dure 30 minutes, sans prolongation à la lecture. Elle est conservée en mémoire : redémarrer l'application déconnecte les utilisateurs et plusieurs instances ne partagent pas les sessions. Le cookie est `HttpOnly`, `SameSite=Lax`, `Path=/`. Pour un déploiement HTTPS, définir `AUTH_COOKIE_SECURE=true` ; laisser `false` pour le HTTP local.

Une réservation conserve le champ `customerRef`, mais le serveur le remplit avec l'identifiant du compte de la session. Un auteur envoyé par le navigateur est ignoré. Lors du premier passage au TP 3, les références historiques reçoivent le préfixe `legacy:` : une ancienne référence libre identique à `user-alice` ne devient ainsi pas une preuve de propriété. Les passages suivants préservent les nouveaux auteurs authentifiés.

## Commandes d'atelier

| Action | Commande |
| --- | --- |
| Lancer les tests ordinaires dans un conteneur | `docker compose --profile test run --build --rm test` |
| Tester les décisions sans base ni serveur (Node.js et `npm ci`) | `npm run test:unit` |
| Vérifier les imports du domaine et de l'application | `npm run check:architecture` |
| Observer le défaut de concurrence initial | `docker compose --profile test run --rm test sh -c 'node dist/migrate.js && npm run test:challenge'` |
| Mesurer la consultation pendant 10 secondes | `docker compose --profile load run --build --rm load` |
| Arrêter les conteneurs en gardant les données | `docker compose down` |
| Réinitialiser la démonstration locale | `docker compose --profile test down -v` puis `docker compose up --build -d` |

Le **test de concurrence échoue volontairement dans la version initiale**. Il crée deux demandes simultanées pour une seule place ; il devient un test de régression une fois la garantie implémentée. Ne le lancez pas sur la base principale : il utilise `db-test`, une base séparée. Les tests ordinaires réinitialisent également cette base de test avant chaque scénario.

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
| `GET /health` | Santé de l'application et accès à la base |

Les erreurs JSON ont la forme `{ "error": { "code": "…", "message": "…" } }`. Sans session valide : `401 AUTH_REQUIRED`. Connexion refusée : `401 INVALID_CREDENTIALS`. Accès à une réservation étrangère : `403 RESERVATION_FORBIDDEN`. La réservation peut renvoyer `400` (entrée invalide), `404` (événement absent) ou `409` (`EVENT_CANCELLED` ou `SOLD_OUT`). Le checkout peut également renvoyer `410` (réservation expirée) ou `409 RESERVATION_CLOSED`. Une erreur technique retourne `503`.

## Progression pédagogique

Commencer par découvrir les objets et parcours métier **avant** d'utiliser les dossiers du code comme modèle de découpage. Puis faire évoluer le monolithe par étapes : N-Layer, Clean Architecture, CQRS et vertical slices. Comparer ensuite plusieurs découpages fonctionnels, décider et justifier une extraction en **trois services**, puis travailler les problèmes de concurrence, transactions, pannes et scalabilité. Cette suite sert à faire apparaître de nouvelles contraintes ; aucun style n'est présenté comme supérieur en toute situation.

La [méthode de découpage](docs/ateliers/decoupage-fonctionnel.md) guide l'enquête sans nommer les services attendus. Le [modèle d'ADR](docs/adr-template.md) et les [règles d'usage de l'IA](docs/usage-ia.md) accompagnent la justification des décisions.

## Structure du TP 4

```text
public/                interface du TP 3 conservée
src/domain/            modèles, règles et erreurs sans HTTP
src/application/       huit cas d'usage et ports
src/adapters/http/     routes, cookies, traduction des erreurs
src/adapters/postgres/ réalisations SQL des ports
src/adapters/auth/     scrypt et sessions mémoire
src/adapters/payment/  paiement fictif
src/adapters/system/   horloge, identifiants et temporisation
src/bootstrap/        assemblage des composants
src/app.ts             entrée compatible du serveur et des tests
db/                    migrations et données conservées
tests/unit/            décisions en mémoire, sans base ni Fastify
tests/                 contrats HTTP, front, migration et défi séparé
scripts/               contrôle des dépendances et mesure de charge
```

Les anciens services ont été remplacés par des cas d'usage construits dans `src/bootstrap/createUseCases.ts`. Les décisions de propriété, d'annulation et de paiement ne connaissent ni Fastify, ni SQL, ni cookie. Le domaine exprime des erreurs métier ; l'adaptateur HTTP choisit leur statut. Voir [la correction TP 4](docs/corrections/tp4.md) pour l'inventaire, les schémas et les résultats de validation.

La suite comporte **43 tests en mémoire**, les **24 tests du TP 3 inchangés** et **11 tests de traduction des erreurs HTTP** : **78 tests ordinaires**. La concurrence, l'idempotence et la persistance des sessions restent les ateliers suivants.
