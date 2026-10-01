# Socle pédagogique de billetterie — conception

## Intention et cadre

Créer un dépôt public `LargeGaultier/architecture-billetterie-starter` pour le cours « Architecture et choix technologiques ». Le dépôt fournit une application de départ exécutable et des expériences reproductibles. Les étudiants partent d'un cas métier qui fonctionne, observent ses limites, puis décident et implémentent des évolutions d'architecture. Le dépôt ne contient pas la correction des ateliers.

Le cours part d'un monolithe structuré en couches avant d'étudier les frontières de services. Le nombre de microservices n'est pas une cible. Le résultat attendu est la capacité à justifier les frontières, les garanties métier et les mécanismes de scalabilité à partir de preuves.

## Parcours métier livré

Une billetterie vend des places en placement libre pour quelques événements fictifs. Le visiteur consulte les événements et le nombre de places affiché, crée une réservation d'une place, puis confirme son achat auprès d'un paiement simulé. Il peut consulter l'état de sa réservation. Le paiement simulé peut réussir, échouer ou répondre lentement afin de fournir des scénarios d'atelier sans fournisseur externe ni argent réel.

L'interface web est volontairement simple et servie par l'application. Elle présente les événements, déclenche la réservation et la confirmation, puis affiche un état explicite. Elle ne demande aucune donnée personnelle réelle : un identifiant client fictif suffit.

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
- Structure initiale lisible en routes, services et repositories. Le parcours de réservation pourra être refactorisé pendant le cours sans réécrire toute l'application.
- Interface HTML/CSS/JavaScript légère servie par l'application. Aucun framework frontal n'est nécessaire pour les ateliers d'architecture backend.
- Données d'exemple et migrations versionnées.
- Aucun broker dans le démarrage initial. L'extraction d'un traitement différé et le choix de son mécanisme restent du travail étudiant.

Le parcours nominal fonctionne dès le départ. Le contrôle initial de capacité est volontairement insuffisant sous concurrence : deux demandes peuvent lire la même disponibilité avant d'enregistrer leurs réservations. Cette limite est nommée dans le sujet, démontrée par un scénario de test séparé et corrigée par les étudiants. Le dépôt ne prétend pas être un modèle de production.

## Trajectoire de migration étudiée

1. **Monolithe initial** : observer le flux de réservation, le coût du changement et la charge avant de créer une frontière réseau.
2. **Frontières internes** : clarifier catalogue, réservation et paiement dans le code, sans multiplier encore les déploiements. Protéger localement l'invariant de capacité.
3. **Premier service extrait** : les étudiants développent une notification différée, déployable séparément via Docker Compose. Elle possède son état de traitement et consomme un contrat explicite. Ils choisissent et éprouvent le mécanisme de livraison, le traitement des doublons et la reprise après panne.
4. **Décision d'évolution** : à partir des mesures de lecture, comparer l'amélioration du monolithe à l'extraction d'une capacité de consultation. Une extraction supplémentaire demande une justification ; elle n'est pas nécessaire pour terminer le socle.

La capacité de l'événement et la décision de réservation restent sous la même autorité transactionnelle. Les séparer uniquement pour augmenter le nombre de services introduirait une coordination distribuée autour de l'invariant central. La migration rend visibles les coûts nouveaux : latence réseau, contrats, cohérence, observabilité, déploiement et exploitation.

## Exécution intégralement conteneurisée

`docker compose up --build` construit et lance l'application, son interface et PostgreSQL, applique les migrations et installe les données fictives. Le poste étudiant n'a besoin que de Docker et d'un navigateur. Les dépendances applicatives sont verrouillées dans le dépôt.

Le fichier Compose comprend une base persistée dans un volume local, un service de migration/initialisation à exécution unique et l'application. Des services Compose à lancement explicite exécutent les tests et la simulation de charge dans des conteneurs. Les commandes de démarrage, de remise à zéro des données, de tests et de charge sont documentées pour Windows, macOS et Linux. Des contrôles de santé empêchent l'application de démarrer avant que la base soit prête.

Le paiement est un simulateur local dans l'application. Ses modes `success`, `failure` et `slow` sont configurables pour les ateliers. Aucun secret, service cloud, compte externe ou véritable paiement n'est nécessaire.

## Ateliers rendus possibles par le socle

1. **Architecture initiale** : repérer les responsabilités, documenter le flux et écrire les invariants.
2. **Concurrence** : reproduire une surréservation et protéger l'invariant à l'endroit qui fait autorité. Comparer au moins deux corrections possibles.
3. **Frontières internes** : ajouter une règle métier, identifier le coût du changement, puis refactoriser le seul parcours de réservation qui le justifie.
4. **Charge en lecture** : mesurer la consultation de disponibilité et comparer lecture directe, cache ou projection. Une valeur affichée peut être légèrement en retard ; la décision de réservation reste autoritaire.
5. **Défaillances** : injecter lenteur et échec du paiement, puis défendre timeout, reprise et état visible au client.
6. **Évolution distribuée** : extraire une notification différée en second conteneur applicatif. Choisir le contrat, le propriétaire des données et la stratégie face à un message répété ou perdu. L'outbox et l'idempotence sont des solutions possibles à étudier, pas des éléments déjà implémentés dans le socle.

Chaque atelier demande un résultat exécutable, une mesure ou un test, puis une justification courte. Les consignes séparent les faits imposés des décisions laissées aux étudiants.

## Vérification du socle

- Les tests ordinaires valident le parcours nominal, les transitions d'état et les erreurs prévues.
- Un scénario de concurrence contrôlé met en évidence la limite initiale sans dépendre d'une course aléatoire. Il reste séparé de la vérification de démarrage afin que le socle livré ait des tests ordinaires verts.
- Le générateur de charge restitue au minimum nombre de requêtes, débit, erreurs et latence médiane et au 95e percentile. Les résultats servent de point de comparaison ; aucun seuil universel n'est inventé.
- La documentation explique les limites de mesure locale et les moyens de remettre la base dans un état comparable avant chaque expérience.
- Une CI GitHub vérifie construction, typage et tests ordinaires. Elle n'exécute pas le scénario pédagogique attendu comme échec initial.

## Documentation livrée

- `README.md` : objectif pédagogique, prérequis Docker, démarrage et parcours de démonstration.
- `docs/architecture-initiale.md` : état initial, responsabilités et limites connues, sans solution aux ateliers.
- `docs/ateliers/` : consignes progressives et preuves attendues.
- `docs/adr-template.md` : contexte, critères, options, décision, conséquences et vérification.
- `docs/usage-ia.md` : trace courte des usages significatifs de l'IA, avec décision et vérification humaine.

## Publication

Le projet sera développé dans un nouveau dossier isolé du cours, puis publié comme dépôt public `LargeGaultier/architecture-billetterie-starter` après vérification du démarrage Docker, du parcours nominal et des commandes d'atelier. Le dépôt ne contiendra ni solutions enseignantes ni identifiants personnels.

## Limites assumées

Le socle ne reproduit pas le trafic d'une grande billetterie réelle. La charge est comprimée pour rendre visibles des problèmes d'architecture sur les machines étudiantes. Le paiement et les clients sont fictifs. Les chiffres observés localement ne servent pas de promesse de capacité de production.
