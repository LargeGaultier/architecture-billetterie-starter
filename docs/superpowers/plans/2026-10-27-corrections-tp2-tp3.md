# Corrections TP 2 et TP 3

**Objectif :** livrer deux branches cumulatives, exécutables avec Docker, avec tests et notes de correction.
**Références :** [TP 2](https://www.notion.so/3efa4f0ae4ab81a6b59dee93581616a4), [TP 3](https://www.notion.so/3f0a4f0ae4ab817f8809efb4c58c68c7), consultés le 27 octobre 2026.
**Architecture :** conserver le N-Layer TypeScript/Fastify/PostgreSQL. Le TP 3 conserve `customerRef` et y stocke l'identifiant vérifié. Sessions en mémoire à expiration de 30 minutes, deux comptes PostgreSQL avec scrypt salé, cookie opaque.

## Étapes

- [x] TP 2 : ajouter des tests HTTP refusant l'événement annulé et le changement depuis une consultation ouverte, vérifier leur échec, ajouter le contrôle dans `TicketingService.reserve`, rejouer les tests et documenter le trajet/coût. Commit sur `correction/tp2`.
- [x] TP 3 : tests HTTP via vraie connexion, absence d'effet pour 401/403, identité forgée, expiration contrôlée, déconnexion, états antérieurs. Vérifier l'échec avant l'implémentation.
- [x] Ajouter migration utilisateurs et initialisation idempotente des deux comptes, `UserRepository`, `AuthService`, `SessionService`, cookies et routes. Contrôler la propriété avant expiration ou paiement pour éviter tout effet en cas de refus.
- [x] Adapter l'interface et le défi concurrent pour les comptes connectés ; conserver le défi séparé et volontairement rouge sur la survente du TP 8.
- [x] Documenter modèles, services, limites et trace IA ; construire/tester Docker, revoir l'ensemble et publier `correction/tp2` et `correction/tp3`.

## Points de revue

Identité jamais lue depuis le corps ; aucun hash exposé ; expiration au seuil exact ; ancien cookie inutilisable ; bases de test uniquement ; migration rejouable sans écrasement ; parcours existants conservés ; ne pas anticiper Clean ni les garanties de concurrence.
