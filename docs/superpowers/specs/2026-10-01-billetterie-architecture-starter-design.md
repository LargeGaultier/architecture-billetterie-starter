# Socle pédagogique de billetterie — conception

## Intention et cadre

Créer un dépôt public `LargeGaultier/architecture-billetterie-starter` pour le cours « Architecture et choix technologiques ». Le dépôt fournit une application de départ exécutable et des expériences reproductibles. Les étudiants partent d'un cas métier qui fonctionne, observent ses limites, puis décident et implémentent des évolutions d'architecture. Le dépôt ne contient pas la correction des ateliers.

Le cours part d'un monolithe structuré en couches avant d'étudier les frontières de services. Le TP d'extraction impose trois services métier comme contrainte pédagogique, sans indiquer leurs noms ni leurs responsabilités. Le résultat attendu est la capacité à justifier les frontières, les garanties métier et les mécanismes de scalabilité à partir de preuves. L'ordre N-Layer, Clean, CQRS, vertical slices, microservices n'est pas une échelle de qualité.

## Parcours métier livré

Une billetterie vend des places en placement libre pour quelques événements fictifs. Le visiteur consulte les événements et le nombre de places affiché, crée une réservation d'une place, puis confirme son achat auprès d'un paiement simulé. Il peut consulter l'état de sa réservation. Le paiement simulé peut réussir, échouer ou répondre lentement afin de fournir des scénarios d'atelier sans fournisseur externe ni argent réel.

L'interface web est volontairement simple et servie par l'application. Elle présente les événements, déclenche la réservation et la confirmation, puis affiche un état explicite. Elle ne demande aucune donnée personnelle réelle : un identifiant client fictif suffit.

### Paiement simulé dans le socle

Le paiement fait partie du parcours livré, pas seulement d'un exercice futur. Après la réservation, le visiteur déclenche le checkout depuis l'interface. Le simulateur enregistre une tentative de paiement et produit un résultat `SUCCEEDED`, `FAILED` ou `PENDING` selon le scénario activé. La réservation devient `CONFIRMED` après un succès et `FAILED` après un refus certain. Si la réponse tarde ou se perd, elle reste dans un état explicite consultable ; le système ne transforme pas un timeout en refus supposé. Aucun argent réel, compte marchand ni prestataire externe n'est utilisé.

Le scénario nominal permet de réserver et de payer jusqu'au bout dès le premier lancement Docker. Le simulateur expose aussi refus et lenteur. Les étudiants complètent la gestion des tentatives répétées, des résultats incertains et de la reprise, puis décident comment répartir cette capacité lors de l'extraction. Une tentative répétée ne doit finalement pas créer un second paiement accepté pour la même réservation ; cette garantie est un objectif d'atelier, pas une propriété prétendue du socle initial.

### États et règles métier

- Un événement possède une capacité finie.
- Une réservation occupe une place pendant une courte période configurable. Elle passe ensuite à `CONFIRMED`, `FAILED` ou `EXPIRED`.
- Une réservation confirmée occupe définitivement sa place dans la simulation.
- Une réservation en attente expirée ou un paiement échoué libère la place.
- Le nombre de réservations actives, en attente ou confirmées, ne doit jamais dépasser la capacité. C'est l'invariant à protéger pendant les ateliers.
- La réponse de paiement peut être incertaine après un délai. Le code et l'interface doivent conserver un état explicite plutôt que supposer un succès ou un échec.

### API de départ

| Route | Rôle |
| --- | --- |
| `GET /api/events` | Lister les événements et la disponibilité affichée. |
| `GET /api/events/:id` | Consulter un événement. |
| `POST /api/reservations` | Demander une réservation d'une place. |
| `GET /api/reservations/:id` | Consulter l'état de la réservation. |
| `POST /api/reservations/:id/checkout` | Déclencher le paiement simulé et mettre à jour l'état. |
| `GET /health` | Donner l'état de base de l'application pour Docker Compose. |

Les réponses d'erreur distinguent entrée invalide, événement absent, vente complète, réservation expirée et indisponibilité technique. Les codes et les exemples sont documentés dans le dépôt.

## Architecture initiale

- Un seul processus et un seul déploiement contiennent le catalogue, les réservations et le paiement simulé. C'est le monolithe de départ, pleinement utilisable dans le parcours nominal.
- TypeScript/Node.js avec Fastify pour l'API.
- PostgreSQL avec `pg` et SQL explicite pour rendre visibles les lectures, écritures et transactions.
- Structure initiale N-Layer lisible en routes, services et repositories. Une classe métier centrale, par exemple `TicketingService`, fait fonctionner consultation, réservation et orchestration du checkout. Elle accumule volontairement plusieurs responsabilités de Catalogue, Réservation et Paiement, et dépend de repositories concrets et du simulateur. Le parcours est crédible et exécutable, mais une nouvelle règle traverse ce point de passage ; les étudiants pourront le constater puis refactoriser une tranche sans réécrire toute l'application.
- Interface HTML/CSS/JavaScript légère servie par l'application. Aucun framework frontal n'est nécessaire pour les ateliers d'architecture backend.
- Données d'exemple et migrations versionnées.
- Aucun broker dans le démarrage initial. Le paiement simulé est d'abord un module du monolithe ; les frontières et les contrats interservices restent du travail étudiant.

Le parcours nominal fonctionne dès le départ. Les défauts pédagogiques restent ciblés et observables : concentration des responsabilités dans la classe métier centrale, couplage aux détails techniques et contrôle de capacité insuffisant sous concurrence. Deux demandes peuvent lire la même disponibilité avant d'enregistrer leurs réservations ; cette limite est nommée dans le sujet, démontrée par un scénario de test séparé et corrigée par les étudiants. Les comportements ordinaires ont des tests verts pour permettre un refactoring sûr. Le dépôt ne prétend pas être un modèle de production.

## Trajectoire de migration étudiée

1. **Monolithe initial** : exécuter le parcours complet consultation → réservation → paiement simulé. Identifier les parcours et domaines métier sans partir des dossiers, puis confronter cette carte à la classe métier centrale, au coût du changement et à la charge avant de créer une frontière réseau.
2. **Refactorisations internes** : améliorer d'abord le N-Layer existant, isoler une décision avec Clean Architecture, introduire des chemins commande/requête CQRS sur la même base, puis regrouper le code par capacités dans des vertical slices. Chaque transformation est jugée par son bénéfice et son coût.
3. **Découpage et extraction** : reprendre les cartes d'objets métier et les frontières éprouvées dans le monolithe. Comparer deux découpages à trois services, choisir la propriété des décisions et des données, les contrats et les stockages, puis extraire les trois processus. Les choix sont consignés dans deux ADR et des schémas C4. Le dépôt initial ne donne pas les noms ou les frontières à retenir.
4. **Problèmes du distribué** : après l'extraction, reproduire la concurrence de la dernière place, tracer les transactions locales, puis traiter les réponses perdues, doublons et pannes partielles. Les étudiants choisissent et prouvent les mécanismes de correction.
5. **Scalabilité et documentation finale** : mesurer un pic de consultation, comparer index, cache, projection ou montée en charge ciblée, puis rédiger un ADR de scalabilité et le DAT du système livré.

Le socle initial rend visibles les décisions et l'état autoritaire sans prescrire leur future répartition. Une séparation qui place un invariant critique entre plusieurs autorités impose de la coordination ; les étudiants doivent pouvoir réviser leur frontière. La migration rend visibles les coûts nouveaux : latence réseau, contrats, cohérence, observabilité, déploiement et exploitation.

| Fourni dans le dépôt de départ | À implémenter pendant le cours |
| --- | --- |
| Catalogue, réservation et checkout nominal dans un monolithe Docker. | Protection de la capacité en concurrence et justification de la correction. |
| Simulateur de paiement avec succès, refus et lenteur reproductibles. | Politique face aux tentatives répétées, aux timeouts et aux résultats incertains. |
| Tests ordinaires, scénarios de défi et outil de mesure. | Tests des nouvelles garanties et interprétation des mesures. |
| Structure en couches et documentation initiale. | Frontières internes, trois services définis par les groupes, ADR et C4. |

## Exécution intégralement conteneurisée

`docker compose up --build` construit et lance l'application, son interface et PostgreSQL, applique les migrations et installe les données fictives. Le poste étudiant n'a besoin que de Docker et d'un navigateur. Les dépendances applicatives sont verrouillées dans le dépôt.

Le fichier Compose comprend une base persistée dans un volume local, un service de migration/initialisation à exécution unique et l'application. Des services Compose à lancement explicite exécutent les tests et la simulation de charge dans des conteneurs. Les commandes de démarrage, de remise à zéro des données, de tests et de charge sont documentées pour Windows, macOS et Linux. Des contrôles de santé empêchent l'application de démarrer avant que la base soit prête.

Le paiement est un simulateur local dans l'application. Ses modes `success`, `failure` et `slow` sont configurables pour les ateliers. Aucun secret, service cloud, compte externe ou véritable paiement n'est nécessaire.

## Ateliers rendus possibles par le socle

1. **Découpage fonctionnel avant extraction** : identifier les parcours, les domaines et leurs décisions/invariants, puis décrire les slices candidates (entrée, règle, données, résultat). Produire deux frontières de services possibles et attribuer décisions et données à des propriétaires. Confronter la carte métier à la classe centrale du code fourni ; éprouver les frontières avec des cartes de changement, de panne et de charge. Le matériel d'atelier comprend un canevas de carte des slices, de matrice d'ownership et d'ADR ; il ne fournit pas le découpage retenu.
2. **Concurrence** : reproduire une surréservation et protéger l'invariant à l'endroit qui fait autorité. Comparer au moins deux corrections possibles.
3. **Architecture du code** : ajouter une règle métier à la classe centrale du N-Layer et observer les responsabilités et dépendances touchées ; extraire un cas d'usage de réservation avec domaine et ports/adaptateurs ; implémenter des chemins commande/requête CQRS sur la même base ; ranger ces cas d'usage dans les slices proposées lors du découpage fonctionnel. La nécessité d'une projection de lecture distincte sera réévaluée après les mesures de charge.
4. **Charge en lecture** : mesurer la consultation de disponibilité et comparer lecture directe, cache ou projection. Une valeur affichée peut être légèrement en retard ; la décision de réservation reste autoritaire.
5. **Défaillances** : injecter lenteur et échec du paiement, puis défendre timeout, reprise et état visible au client.
6. **Évolution distribuée** : extraire trois services métier après comparaison des frontières possibles. Choisir les contrats, la propriété des données et la stratégie face à un appel répété, tardif ou perdu. L'idempotence, la réconciliation et, dans une extension asynchrone, l'outbox sont des solutions possibles à étudier, pas des éléments déjà implémentés dans le socle.

Chaque atelier demande un résultat exécutable, une mesure ou un test, puis une justification courte. Les consignes séparent les faits imposés des décisions laissées aux étudiants.

## Vérification du socle

- Les tests ordinaires valident le parcours nominal jusqu'au paiement simulé, les transitions d'état et les erreurs prévues.
- Un scénario de concurrence contrôlé met en évidence la limite initiale sans dépendre d'une course aléatoire. Il reste séparé de la vérification de démarrage afin que le socle livré ait des tests ordinaires verts.
- Le générateur de charge restitue au minimum nombre de requêtes, débit, erreurs et latence médiane et au 95e percentile. Les résultats servent de point de comparaison ; aucun seuil universel n'est inventé.
- La documentation explique les limites de mesure locale et les moyens de remettre la base dans un état comparable avant chaque expérience.
- Une CI GitHub vérifie construction, typage et tests ordinaires. Elle n'exécute pas le scénario pédagogique attendu comme échec initial.

## Documentation livrée

- `README.md` : objectif pédagogique, prérequis Docker, démarrage et parcours de démonstration.
- `docs/architecture-initiale.md` : état initial, responsabilités et limites connues, sans solution aux ateliers.
- `docs/ateliers/` : consignes progressives, cartes métier pour l'atelier de découpage fonctionnel, canevas d'ownership et preuves attendues.
- `docs/adr-template.md` : contexte, critères, options, décision, conséquences et vérification.
- `docs/usage-ia.md` : trace courte des usages significatifs de l'IA, avec décision et vérification humaine.

## Publication

Le projet sera développé dans un nouveau dossier isolé du cours, puis publié comme dépôt public `LargeGaultier/architecture-billetterie-starter` après vérification du démarrage Docker, du parcours nominal et des commandes d'atelier. Le dépôt ne contiendra ni solutions enseignantes ni identifiants personnels.

## Limites assumées

Le socle ne reproduit pas le trafic d'une grande billetterie réelle. La charge est comprimée pour rendre visibles des problèmes d'architecture sur les machines étudiantes. Le paiement et les clients sont fictifs. Les chiffres observés localement ne servent pas de promesse de capacité de production.
