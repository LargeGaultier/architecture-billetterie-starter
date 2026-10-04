# Socle billetterie — plan d'implémentation

**Objectif :** publier un monolithe de billetterie utilisable dès le premier `docker compose up --build`, sans fournir le découpage des TP.

**Source :** `docs/superpowers/specs/2026-10-01-billetterie-architecture-starter-design.md` et parcours Notion 2027.

**Architecture :** routes HTTP, classe applicative centrale, repositories SQL concrets et simulateur de paiement local. Une seule base et un seul processus applicatif au départ. La classe centrale constitue la dérive pédagogique voulue.

**Stack :** TypeScript, Node.js, Fastify, `pg`, PostgreSQL et Docker Compose. Interface web sans framework frontal.

## Étapes

1. Écrire les tests HTTP du parcours nominal, des refus, des états incertains et des erreurs ; constater leur échec initial.
2. Ajouter la migration, les données fictives, les repositories et la classe centrale jusqu'à obtenir les tests verts.
3. Ajouter l'interface web et vérifier le parcours complet dans le navigateur.
4. Conteneuriser base, migration, application, tests et charge ; vérifier les commandes Docker.
5. Ajouter un scénario de concurrence séparé qui échoue sur l'invariant initial, ainsi qu'un outil de mesure reproductible.
6. Documenter l'architecture de départ, ses limites, les commandes et les canevas d'atelier sans donner les frontières des services.
7. Vérifier construction, tests, démarrage et parcours nominal ; publier le dépôt public `LargeGaultier/architecture-billetterie-starter`.

## Points de revue

- Un paiement lent conserve un état inconnu explicite.
- Une réservation échouée ou expirée libère sa place.
- Le chemin nominal fonctionne avec Docker seul.
- Aucun nom ni contrat des trois futurs services n'est prescrit.
- La limite de concurrence est reproductible sans rendre les tests ordinaires rouges.
