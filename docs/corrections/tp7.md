# TP 7 — Extraire trois microservices à partir du découpage métier

Sujet : [Notion TP 7](https://www.notion.so/3efa4f0ae4ab81eab19ad9acb1987fc6), consulté le 30 octobre 2026. Branche `correction/tp7`, depuis `correction/tp6` au commit `b605fc1`.

La cible retient **Identité, Billetterie et Paiement**, avec une gateway technique pour conserver le front et les routes publiques. Les choix et l'alternative à trois services sont justifiés dans [ADR 1](../adr/001-tp7-frontieres-metier.md) et [ADR 2](../adr/002-tp7-stack-donnees-echanges.md).

## C4 contexte existant

```mermaid
flowchart LR
  Personne[Visiteur ou acheteur] --> Systeme[Billetterie : catalogue, session, réservation et paiement fictif]
```

## C4 conteneurs existants — TP 6

```mermaid
flowchart LR
  Navigateur[Interface HTML et JavaScript] --> Monolithe[Node.js : Identité et Billetterie, simulation interne]
  Monolithe --> DB[(PostgreSQL : comptes, événements, réservations, tentatives)]
  Monolithe --> Sessions[Sessions mémoire locales]
```

## C4 conteneurs cibles — TP 7

```mermaid
flowchart LR
  Web[Navigateur : front conservé] --> Gateway[Gateway HTTP : port 3000]
  Gateway --> Identite[Service Identité]
  Gateway --> Billetterie[Service Billetterie]
  Billetterie -->|validation de session| Identite
  Billetterie -->|traitement et historique authentifiés| Paiement[Service Paiement]
  Identite --> IDB[(PostgreSQL Identité)]
  Identite --> Sessions[Map sessions]
  Billetterie --> BDB[(PostgreSQL Billetterie)]
  Paiement --> PDB[(PostgreSQL Paiement)]
```

## Séquence du parcours complet

```mermaid
sequenceDiagram
  actor A as Acheteur
  participant G as Gateway
  participant I as Identité
  participant B as Billetterie
  participant P as Paiement
  A->>G: GET /api/events (public)
  G->>B: catalogue et expiration
  B-->>A: événements et places via G
  A->>G: POST login (login, password)
  G->>I: connexion
  I-->>A: cookie opaque HttpOnly via G
  A->>G: POST reservation (cookie, eventId)
  G->>B: même demande
  B->>I: GET me avec cookie
  I-->>B: utilisateur public
  B->>B: utiliser id, vérifier capacité, créer PENDING
  B-->>A: réservation via G
  A->>G: POST checkout (cookie, scenario)
  G->>B: même demande
  B->>I: vérifier session
  I-->>B: utilisateur public
  B->>B: propriétaire, scénario, expiration et état
  B->>P: traiter tentative (secret service, reservationId, scenario)
  P->>P: créer tentative, simuler, persister résultat
  P-->>B: tentative et statut
  B->>B: CONFIRMED, FAILED ou rester PENDING
  B-->>A: résultat via G
  A->>G: POST logout
  G->>I: révoquer session et effacer cookie
  I-->>A: 204 via G
```

## Matrice des données et décisions

| Donnée | Propriétaire et écritures autorisées | Lectures nécessaires hors propriétaire |
| --- | --- | --- |
| Compte et hash | Identité : migration/seed, lecture du hash pour login | Aucune lecture de hash ; utilisateur public seulement via HTTP |
| Session opaque | Identité : création, révocation, nettoyage ; Map locale | Billetterie demande une validation HTTP, ne lit pas la Map |
| Événement, capacité et statut | Billetterie : seed et décisions de disponibilité | Navigateur lit le catalogue via gateway |
| Réservation, auteur et expiration | Billetterie : création avec id vérifié, transitions et expiration | Paiement reçoit seulement reservationId, sans accès SQL ni droit de modifier la réservation |
| Tentative et résultat fictif | Paiement : création et transition après simulation | Billetterie consulte l'historique via HTTP après contrôle du propriétaire |

Le découpage garde la décision de réserver la dernière place et l'annulation dans Billetterie. Une évolution du scénario de paiement reste dans Paiement. Les deux services doivent coordonner une évolution qui change simultanément le résultat du paiement et la confirmation d'une réservation : ce coût est assumé et visible.

## Suivi de réalisation

Ce dossier est rédigé avant l'extraction. Les contrats, commandes de lancement et preuves de validation seront complétés à partir du code et des tests exécutés.
