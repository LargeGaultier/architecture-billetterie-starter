# ADR 2 — Stack, données et échanges du TP 7

Date : 30 octobre 2026. Statut : retenu pour l'atelier.

TypeScript/Node.js et Fastify sont conservés pour les trois services. La gateway sert le front et relaie HTTP ; elle ne possède aucune décision métier ni base.

| Service | Accès, transaction et fraîcheur | Stockage choisi et charge | Échanges |
| --- | --- | --- | --- |
| Identité | Login unique et hash persistant ; session validée à chaque demande privée, révocation immédiatement observable | PostgreSQL privé pour comptes ; Map locale pour sessions, comme TP 6. Pas de réplication de session ; restart déconnecte | HTTP cookie opaque vers utilisateur public ; Billetterie consomme seulement id |
| Billetterie | Événement/réservation dans la même base ; disponibilité fraîche et propriété avant toute écriture d'achat | PostgreSQL privé pour jointure et contraintes locales ; lectures catalogue potentiellement plus nombreuses | HTTP Identité et Paiement ; agrège le détail seulement après autorisation |
| Paiement | Tentative créée avant simulation puis statut persisté ; historique à relire après un échec de transport | PostgreSQL privé, relation reservationId logique sans FK distribuée ; simulation bornée configurable | HTTP privé authentifié, commande de traitement et requête historique |

Alternatives : base partagée (moins de conteneurs mais pas de vraie propriété et couplage SQL), MongoDB par service (aucun besoin documentaire justifiant la migration), sessions PostgreSQL/Redis (utile pour plusieurs instances, hors comportement actuel), événements/broker (découplent la disponibilité au prix d'une projection, livraison répétée et orchestration). Les contraintes relationnelles locales et le socle connu justifient PostgreSQL partout.

Les trois PostgreSQL ont des identifiants, bases, volumes et endpoints distincts. Seule la connexion de la base propriétaire est injectée dans chaque processus. Aucun service n'a de SQL ou secret de base étrangère. Des secrets de transport entre services authentifient les appels internes de Paiement ; les cookies sont validés par Identité depuis Billetterie. Les en-têtes d'identité fournis par le navigateur sont ignorés.

HTTP est synchrone, avec délai maximal explicite pour chaque dépendance et sans retry automatique des commandes. Panne/timeout ou contrat malformé produit 503 ; un refus métier connu conserve son statut. La gateway possède un budget supérieur au budget des appels aval. Le détail privé demande Paiement et dépend donc de sa disponibilité, alors que le catalogue n'en dépend pas.

Limites : secret de service statique de démonstration et HTTP sur réseaux Docker privés ; production demanderait TLS, gestion/rotation des secrets et observabilité. Les sessions ne survivent pas à Identité. La garantie d'une seule place, l'idempotence et la cohérence paiement/réservation restent ouvertes. Réviser le choix si le débit de login impose une session partagée, si le catalogue doit être indépendant, ou si l'achat doit rester accepté sans disponibilité immédiate de Paiement.

Voir [C4, séquence, contrats et preuves](../corrections/tp7.md). Ces ADR justifient le choix ; le dossier et les tests décrivent le système livré.
