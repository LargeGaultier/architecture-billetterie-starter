# Correction TP 6 — monolithe en capacités verticales

**Objectif :** branche `correction/tp6` depuis `correction/tp5` (`557127d`), mêmes contrats et décisions, un processus et une base. Sujet : [TP 6 dans Notion](https://www.notion.so/3efa4f0ae4ab81ceb5a3fdc8b0a1437a), consulté le 27 octobre 2026.

## Capacités retenues et frontières

- **Identité :** reconnaître un compte et gérer sa session. Propriétaire de `User`, `UserAccount`, `Session`, de `users` et de la Map des sessions. Connexion, déconnexion, utilisateur courant, routes et tests colocalisés.
- **Billetterie :** consulter, réserver et acheter une place, puis suivre son état. Propriétaire de `Event`, `Reservation`, `PaymentAttempt`, de leurs tables, règles et maintenance. Catalogue, réservation et checkout restent ensemble car les invariants et les évolutions du socle les relient.

Chaque module possède ses dossiers `application/commands`, `queries`, `dto`, `ports`, `domain`, `adapters`, `bootstrap`, `contracts`, `tests/unit` et son point d'entrée public `index.ts`. Un fichier par port et modèle est conservé. L'adaptation HTTP Billetterie reçoit un contrat `CurrentActor` : le bootstrap/host le branche sur l'API publique Identité ; aucun accès à son repository, sa session ou sa table.

Le partage est limité aux erreurs, contrats CQRS/horloge/identifiants et utilitaires techniques. La temporisation et les générateurs propres à chaque module restent locaux. SQL, cookies, formats JSON, migrations et paramètres observables sont conservés.

## Passages

- [x] **Référence et carte :** vérifier les 96 tests du TP 5 ; inventorier les fichiers/données et consigner les frontières contestées.
- [x] **Regroupement :** déplacer commandes/requêtes, modèles, ports, adaptateurs et tests dans leur module ; réécrire les imports directs, conserver les façades historiques nécessaires ; compilation et tests en mémoire.
- [ ] **Entrées et assemblage :** routes par module, API publiques, factories et passage explicite de l'identité ; suite complète et commits cohérents.
- [ ] **Contrôle :** adapter le vérificateur Clean/CQRS pour les modules et imports privés ; prouver le rejet des accès interdits et des cycles ; vérifier tests, compilation, Docker et parcours réel.
- [ ] **Rendu :** carte fonctionnelle, diagramme des modules, propriété des données, simulation de changement local et limites ; revue indépendante puis push et vérification de l'ascendance.

## Points de revue

Pas de table/repository étranger atteint par un module ; identité fournie explicitement ; même instance de session pour les trois parcours ; droits avant maintenance ; requêtes sans écriture ; API/JSON/cookies et garantie de refus inchangés ; tests réellement colocalisés sans inclusion dans l'image compilée de production ; aucun découpage réseau, bus ou nouveau mécanisme métier.
