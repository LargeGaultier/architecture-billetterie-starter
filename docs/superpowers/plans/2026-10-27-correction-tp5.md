# Correction TP 5 — CQRS pour tous les parcours

**Objectif :** branche `correction/tp5` issue de `correction/tp4` (`68176aa`), mêmes comportements HTTP et garanties, cinq commandes et quatre requêtes aux contrats explicites.
**Sujet :** [Notion — TP 5](https://www.notion.so/3efa4f0ae4ab81c7b68dce41cf02ccda), consulté le 27 octobre 2026.
**Conventions conservées :** un fichier par port dans `application/ports/`, un fichier par modèle dans `domain/models/`, DTO explicites dans `application/dto/`, assemblage manuel au bootstrap. Pas de framework CQRS, nouveau conteneur DI, bus, broker ou seconde base.

## Décisions de structure

Une intention regroupe sa demande, son résultat et son handler dans un fichier de `application/commands/` ou `application/queries/`. Les handlers exposent `execute(demande)` ; les objets d'entrée remplacent les listes de paramètres positionnels. L'adaptateur HTTP fournit l'identité vérifiée.

Les ports de requête exposent uniquement la lecture et les DTO nécessaires. Les adaptateurs actuels peuvent réaliser ces ports et ceux des commandes sur la même base. Les requêtes projettent explicitement leurs DTO pour ne pas retourner de secret ni de référence vers un stockage mutable.

`ExpirePendingReservations` est une commande interne commune. Les commandes de réservation/checkout l'utilisent ; les routes publiques la déclenchent avant leur requête. Pour le détail privé, la route appelle d'abord la requête pour vérifier les droits, puis la maintenance, puis relit le résultat : un refus 403 conserve l'absence totale de mutations du TP 4. Cette double lecture est un coût explicite du comportement hérité.

## Passages

- [x] **Référence :** vérifier les 78 tests du TP 4 et conserver le commit de départ.
- [x] **Première paire :** requête `GetEvent`, commande `ReservePlace`, ports/DTO nécessaires et maintenance explicite ; tests de lecture pure et revalidation d'un événement annulé après affichage ; branchement HTTP et suite complète.
- [x] **Réservation privée et checkout :** requête `GetMyReservation`, commande `CheckoutReservation`, DTO privé et ports de lecture ; refus sans effet et lecture devenue ancienne par avancée de l'horloge ; branchement et suite complète.
- [x] **Comptes et catalogue :** commandes `LoginUser`/`LogoutUser`, requêtes `GetCurrentUser`/`ListEvents`, ports lecture/effets séparés ; tests des sessions sans prolongation/suppression et DTO sans secret ; retirer les anciens chemins.
- [ ] **Preuves :** maintenir les tests HTTP du TP 4, ajouter les tests d'orchestration maintenance/lecture et de pureté, vérifier compilation et imports Clean ; documentation avec inventaire, contrats, autorité, gains et coûts.
- [ ] **Livraison :** revue indépendante, corrections éventuelles prouvées, push et vérification de l'ascendance de `correction/tp5`.

## Points de revue

401 et 403 avant effets ; même priorité des refus ; état courant relu dans les commandes ; maintien du nettoyage hérité dans HTTP ; aucune écriture ni paiement depuis les requêtes ; DTO distincts des modèles de domaine et sans secret ; pas de suppression ou prolongation lors de la lecture d'une session ; ports unidirectionnels de lecture ; mêmes contrats HTTP et schéma ; concurrence/idempotence toujours hors TP.
