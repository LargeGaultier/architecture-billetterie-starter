# Enquête métier et découpage fonctionnel

Cette méthode accompagne l'atelier sans fournir la carte attendue. Produisez votre propre proposition avant d'ouvrir `src/`.

1. Reconstituez ce qu'un visiteur veut faire, ce qu'il sait à chaque étape et ce que le système lui annonce. Observez l'interface et les réponses de l'API ; notez les zones d'incertitude.
2. Recensez les **objets métier** manipulés et nommez-les avec le vocabulaire du métier. Indiquez pour chacun son cycle de vie, les décisions qui le concernent et les données qu'il doit garder.
3. Dessinez les relations entre ces objets. Repérez les décisions qui exigent plusieurs objets au même instant et les informations simplement consultées.
4. Entourez des **ensembles d'objets fonctionnels** cohérents. Pour chaque ensemble, formulez sa responsabilité en une phrase, les règles qu'il protège et les changements qu'il devrait pouvoir absorber seul.
5. Tracez deux découpages différents. Pour chacun, testez une nouvelle règle, une panne et un pic de charge : quelles frontières sont franchies, par quelles données, avec quelles conséquences ?
6. Revenez au code initial. Où les responsabilités que vous avez distinguées sont-elles mélangées ? Qu'est-ce que ce mélange rend plus difficile à modifier ou à tester ?

Livrables : carte des objets et relations, deux découpages argumentés, points d'incertitude, et exemples précis issus du code ou des requêtes. Ne choisissez aucune technologie de communication tant que la responsabilité et les données à protéger ne sont pas explicites.
