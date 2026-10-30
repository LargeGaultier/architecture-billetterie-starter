# Correction TP 7 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** livrer trois services métier exécutables, leurs données privées et des contrats testés sur `correction/tp7`, depuis TP 6 `b605fc1`.

**Architecture:** Identité conserve comptes/sessions ; Billetterie possède catalogue, disponibilité, réservations, auteur et décision d'achat ; Paiement possède simulation et tentatives. Une gateway technique conserve l'interface et les routes publiques. Billetterie valide le cookie auprès d'Identité puis appelle Paiement par HTTP authentifié ; aucune base étrangère n'est accessible aux services.

**Tech Stack:** TypeScript/Node.js, Fastify, PostgreSQL, HTTP JSON, Docker Compose ; dépendances existantes.

**Spec:** [TP 7 Notion](https://www.notion.so/3efa4f0ae4ab81eab19ad9acb1987fc6), consulté le 30 octobre 2026. Les ADR et diagrammes sont rédigés avant l'extraction dans `docs/corrections/tp7.md` et `docs/adr/`.

## Global Constraints

- Exactement trois services métier, TypeScript/Node.js commun ; gateway hors décompte.
- Trois PostgreSQL et identifiants distincts, aucune clé étrangère distribuée ; nouvelles données de démonstration, volumes TP 6 préservés.
- Ports/modèles dans leurs fichiers propres ; Clean et CQRS internes conservés.
- Pas de session/acteur libre dans un en-tête navigateur : Billetterie valide la session via Identité.
- Paiement privé authentifié par secret de service, aucun port publié ; bornes d'attente et aucun retry automatique d'écriture.
- Contrats publics et UI conservés ; concurrence/idempotence/réconciliation restent les TP suivants.

## Review Focus

Identité indisponible : les routes privées refusent sans mutation, catalogue disponible. Paiement indisponible : achat 503, résultat potentiellement ambigu explicité. Corps/en-têtes forgés : aucun auteur arbitraire accepté. Session révoquée/restart Identité : ancien cookie refusé. Lecture historique Paiement : autorisation Billetterie avant l'appel et aucune table étrangère.

## Tasks

### Task 1 — Contrats et extraction Paiement

Fichiers : `src/modules/payments/{application,domain,adapters,bootstrap,contracts,tests}`, `src/modules/ticketing/application/ports/PaymentProcessor.ts`, checkout et fixtures.

Interfaces : `PaymentProcessor.pay(reservationId, scenario): Promise<PaymentAttempt>` ; Paiement expose commande `ProcessPayment` et requête `ListPaymentAttempts`. Billetterie conserve une représentation locale de résultat externe et le port de lecture des tentatives.

- [x] Écrire des tests en échec : traitement succès/refus/attente, validation avant effets, retour tentative ; adaptation checkout garde les refus et transitions.
- [x] Déplacer le stockage et simulateur Paiement, ajouter handlers/DTO/factory ; aucune décision réservation dans Paiement.
- [x] Vérifier tests en mémoire/compilation et commiter.

### Task 2 — Frontières HTTP et exécution séparée

Fichiers : `src/shared/adapters/http/`, clients HTTP Identité/Paiement, `src/services/`, gateway et `tests/contracts/`.

Interfaces : HTTP JSON versionné documenté ; introspection `/api/auth/me`, paiement `/internal/payments`, historique `/internal/reservations/:id/payments`. Client HTTP valide la réponse et borne l'attente. `buildGatewayApp(upstreams)` relaie les routes publiques sans décision métier ni base.

- [x] Tests en échec des contrats réels HTTP : cookie, auteur forgé, secret invalide, payload invalide, délai dépassé, réponse invalide, erreur métier.
- [x] Implémenter serveurs séparés, clients/adaptateurs, error mapping commun et gateway ; retirer l'assemblage monolithique de production.
- [x] Adapter les tests globaux avec un harness réseau et trois bases, sans retirer leurs assertions métier.
- [x] Vérifier compilation/contrats, commiter.

### Task 3 — Données privées et Compose

Fichiers : migrations/seeds par service, `src/migrate.ts`, `compose.yaml`, vérificateur architectural et tests.

- [x] Écrire les tests d'isolation SQL et imports ; contrôler que les données ne sont accessibles que dans la base propriétaire.
- [x] Composer trois services et PostgreSQL privés, gateway publiée, migrations idempotentes locales à chaque service ; profil test séparé.
- [x] Exécuter la suite complète dans Docker depuis un export Git exact hors OneDrive, vérifier santé et absence des tests dans dist ; commiter.

### Task 4 — Parcours, pannes, redémarrage et rendu

Fichiers : tests de parcours/pannes, scripts de validation, `docs/corrections/tp7.md`, deux ADR, README.

- [x] Vérifier login/logout/catalogue/achat, refus Bob et sans session, panne lente/coupée, redémarrage isolé Paiement et Identité.
- [x] Renseigner preuves, matrice données/écritures/lectures, deux options, stack, C4 avant/après, séquence, réponses aux pannes et questions ouvertes.
- [x] Contre-expertise indépendante après proposition et implémentation ; résoudre défauts concrets, validation finale.
- [x] Préparer les commits et la publication sur `correction/tp7` ; vérifier l'ascendance TP 6. Le push et la comparaison du hash distant constituent l'opération finale de livraison.

## Ledger

Ruling : travailler dans la branche dédiée du checkout existant, comme les corrections précédentes ; aucun travail utilisateur non commité et aucune isolation supplémentaire requise.
Ruling : PostgreSQL par service sur trois instances locales ; surcoût d'exploitation accepté pour matérialiser les droits et éviter une fausse confidentialité par convention.
Ruling : accès direct HTTP synchrone sans broker ; plus simple à éprouver ici, mais dépendance de disponibilité et ambiguïté après timeout explicitement conservées.

Task 1: complete — 60 tests en mémoire et compilation réussis ; tentative créée/simulée/persistée par Paiement. Commit `4d2ddda`.
Task 2: complete — services séparés et gateway, contrats HTTP réels ; aucun import direct entre services. Commit `201814f`.
Task 3: complete — trois PostgreSQL/réseaux privés ; tests SQL étrangers absents et migrations idempotentes réussis. Suite initiale de l'extraction : 129 tests.
Task 4: complete — suite finale 135/135, contrôle architectural, trois scénarios de paiement, refus, pannes et reprises Docker. Image propre : 109 fichiers compilés, sans tests. Défi TP 8 conservé en échec attendu (deux demandes pour une place).
Ruling : le budget gateway passe à 10 s pour couvrir validation Identité + deux historiques de 3,5 s sur le détail privé.
Ruling : une erreur du secret RPC devient technique ; seule AUTH_REQUIRED d'Identité est propagée comme refus de session.
Review : défaut UUID majuscule confirmé rouge puis corrigé par normalisation avant échange ; contrat et test PostgreSQL/réseau ajoutés. Revue finale code et documentation : aucun défaut bloquant restant ; précisions santé gateway et maintenance antérieure intégrées.
