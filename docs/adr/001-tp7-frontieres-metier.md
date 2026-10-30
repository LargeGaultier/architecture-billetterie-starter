# ADR 1 — Frontières métier du TP 7

Date : 30 octobre 2026. Statut : retenu pour l'atelier.

Le TP 6 regroupe Identité et Billetterie ; le TP 7 impose trois services métier. La carte fonctionnelle relie un compte à une session, un acteur reconnu à des réservations, une réservation à un événement et à des tentatives de paiement. Disponibilité, expiration et confirmation se répondent ; reconnaissance du compte et exécution du paiement ont des cycles propres.

| Option | Attribution des décisions | Changement de règle | Dépendance en panne |
| --- | --- | --- | --- |
| A : Identité / Billetterie / Paiement | Session dans Identité ; capacité, droits et réservation dans Billetterie ; traitement fictif et tentatives dans Paiement | Garder une place organisateur touche Billetterie ; changer le résultat d'un scénario touche Paiement | Paiement coupé : catalogue/réservation fonctionnent, achat et historique complet répondent 503 ; Identité coupée : catalogue disponible, privé 503 |
| B : Catalogue / Achat-et-Identité / Paiement | Publication dans Catalogue ; session, capacité/réservation/achat dans Achat ; tentatives dans Paiement | Annulation demande une lecture Catalogue lors de l'achat et une politique de fraîcheur ; évolution de session touche le service d'achat | Catalogue coupé empêche de vérifier l'annulation à la réservation ; session et achat couplent leurs redémarrages |

Choix A : conserver catalogue et stock avec les réservations préserve leur jointure et l'état autoritaire local. Extraire Paiement est justifié par la décision de traitement et le cycle des tentatives, et prépare le remplacement du simulateur derrière son port. Ce service ne décide ni de l'identité ni de la validité d'une réservation : Billetterie autorise et vérifie d'abord, puis lui délègue une tentative.

Coût accepté : les tentatives et la réservation ne sont plus dans la même transaction ; timeout ou interruption après paiement peut laisser un paiement réussi et une réservation encore en attente. Aucun retry automatique ne masque cette incertitude. L'absence d'idempotence et de réconciliation est une question ouverte explicite, à traiter dans les TP suivants. Aucune quatrième capacité d'authentification ni découpage par table n'est ajouté.

Architecture et preuves : [correction TP 7](../corrections/tp7.md), tests `tests/contracts/`, parcours Docker et tests d'autorisation existants adaptés aux frontières réseau.
