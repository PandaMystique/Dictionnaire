# Dictionnaire de Philosophie

Application de lecture monopage pour consulter hors ligne le *Dictionnaire de philosophie* des Wikilivres. Un seul fichier HTML (~385 Ko), aucune dépendance, aucun serveur. Interface en français, stockage entièrement local, conçue pour le bureau comme pour le mobile (avec build Android via Capacitor).

---

## Sommaire

- [Démarrage rapide](#démarrage-rapide)
- [Import et synchronisation](#import-et-synchronisation)
- [Lecture](#lecture)
- [Navigation et recherche](#navigation-et-recherche)
- [Page d'accueil](#page-daccueil)
- [Apparence](#apparence)
- [Outils](#outils)
- [Raccourcis clavier](#raccourcis-clavier)
- [Build Android](#build-android)
- [Architecture](#architecture)
- [Le parseur MediaWiki](#le-parseur-mediawiki)
- [Sécurité](#sécurité)
- [Format des données](#format-des-données)
- [Dépannage](#dépannage)
- [Historique des changements](#historique-des-changements)
- [Licence](#licence)

---

## Démarrage rapide

Ouvrir `dictionnaire-philosophie.html` dans un navigateur. Au premier lancement, la page d'accueil propose un bouton **Importer depuis Wikilivres**. Un clic télécharge tous les articles du dictionnaire (avec barre de progression). Une fois l'import terminé, l'application fonctionne entièrement hors ligne : les articles sont stockés localement dans le navigateur.

Aucune installation, aucun compte, aucune connexion requise après l'import initial.

---

## Import et synchronisation

Les articles proviennent de l'API MediaWiki de `fr.wikibooks.org`, récupérés en JSONP. Ils sont conservés dans IndexedDB (avec repli sur localStorage).

**Import en masse.** Télécharge l'ensemble du dictionnaire en une opération. Les pages d'index (lettres seules, sommaires) sont ignorées. La détection de doublons se fait sur trois niveaux : titre normalisé, identifiant Wikilivres, et vérification en direct pendant la boucle d'import. Les imports répétés n'ajoutent jamais de doublon.

**Import individuel.** Depuis l'éditeur, la saisie d'un terme récupère un article précis.

**Vérification des mises à jour.** Au lancement (silencieuse, au maximum une fois par 24 h) et à la demande. L'application compare les numéros de révision locaux avec Wikilivres et signale les articles modifiés via un bandeau sur l'accueil. Sur Android, une notification locale peut être émise.

**Catégories.** Extraites directement du balisage wiki `[[Catégorie:...]]`. Aucune catégorie n'est inventée : si l'article source n'en porte pas, le champ reste vide. Le bouton *Recatégoriser* relance l'extraction sur tous les articles.

**Classement par nom de famille.** Les articles biographiques (philosophes) sont détectés automatiquement — via la catégorie `Philosophe`, la tournure « *est un philosophe* » dans l'introduction, ou un motif de dates de naissance — puis classés à la lettre de leur **nom de famille**, pas de leur prénom. *Maurice Merleau-Ponty* est rangé sous M, *Jean-Paul Sartre* sous S, *Simone de Beauvoir* sous B, *Thomas d'Aquin* sous A. Les particules françaises (de, du, d', von, van…) sont gérées selon l'usage. Les concepts gardent le classement sur la première lettre de leur titre.

**Dédoublonnage automatique.** Au démarrage et après chaque restauration IndexedDB, les entrées en double (même terme normalisé) sont fusionnées en conservant la plus récente.

**Export / Import JSON.** Sauvegarde et restauration complètes (articles, favoris, historique, articles lus, notes, surlignages). L'import JSON fusionne sans créer de doublons.

**Export EPUB.** Génère un livre numérique avec table des matières et feuille de style intégrée.

**Re-traiter.** Re-analyse tous les articles depuis leur source Wikilivres stockée, en appliquant la dernière version du parseur (notes de bas de page, modèles, classement par nom). Les notes, favoris et surlignages personnels sont préservés. Utile après une mise à jour de l'application.

---

## Lecture

**Rendu MediaWiki complet.** Titres à quatre niveaux, listes, citations, gras et italique, liens internes et externes, notes de bas de page numérotées et cliquables, bibliographie. Les modèles français courants sont développés (siècles, ordinaux, `{{citation}}`, `{{lang}}`), de même que les modèles bibliographiques (`{{Ouvrage}}`, `{{Article}}`, `{{Chapitre}}`, `{{Lien web}}`), formatés en citations lisibles.

**Notes de bas de page bidirectionnelles.** Les références `<ref>` du wikitext deviennent des exposants cliquables `[1]` `[2]` collés à leur mot, qui amènent à la note correspondante en bas de l'article. Inversement, chaque note possède une flèche de retour `↑` qui ramène à l'endroit du texte où elle est appelée. Une source citée à plusieurs reprises n'apparaît qu'une fois, avec plusieurs liens de retour étiquetés `a`, `b`, `c`. La cible clignote brièvement à l'arrivée. Les notes appelées dans le texte et la bibliographie sont présentées dans deux blocs distincts : « Notes & références » et « Bibliographie ».

**Aperçu d'un terme.** Au survol (bureau) ou à l'appui prolongé (mobile) d'un terme auto-lié, une bulle affiche son titre, sa catégorie et le début de sa définition, sans quitter la page.

**Recherche dans l'article.** Un bouton loupe dans la barre de lecture, ou `Ctrl/Cmd+F`, ouvre une recherche intra-article qui surligne toutes les correspondances, affiche un compteur d'occurrences et permet de sauter de l'une à l'autre (`Entrée` / `Maj+Entrée`). La recherche est insensible à la casse et aux accents. Quand on ouvre un article depuis la recherche globale, ses occurrences sont automatiquement surlignées.

**Lettrine.** Le premier caractère de l'article s'affiche en lettrine décorative (désactivable).

**Césure automatique.** `hyphens: auto` pour un texte justifié sans rivières.

**Sommaire.** Flottant sur le côté (bureau) ou dépliable (mobile), avec suivi de la position de lecture (la section courante est surlignée).

**Mode focus.** Masque la barre latérale pour lire en pleine largeur.

**Mode immersif.** Masque toute l'interface de navigation pour une lecture sans distraction.

**Lecture audio.** Synthèse vocale (Web Speech API) avec réglage de la vitesse.

**Barre de progression.** En haut de l'écran sur mobile, minimap verticale sur le côté au bureau. La position de défilement est mémorisée par article.

**Surlignage.** La sélection de texte peut être surlignée ; les surlignages sont persistés.

**Notes personnelles.** Une zone de texte libre est attachée à chaque article.

**Fiche express.** Un résumé structuré de l'article : définition, étymologie, idées clés (extraites des premières phrases significatives), philosophes mentionnés, et articles à relier.

**Auto-liens.** Les termes du dictionnaire présents dans le corps d'un article deviennent automatiquement cliquables vers leur définition.

**Pied d'article.** Sous une séparation unique, un bloc cohérent regroupe la catégorie, les articles liés, la section « Cité dans » et les étiquettes personnelles.

**Articles liés.** Détection automatique des articles connexes par analyse du contenu (correspondance à frontières de mots, classée par fréquence).

**Cité dans (références inverses).** Chaque article liste les autres articles qui le mentionnent. L'index est obtenu en inversant les mots-clés des articles ; pour les philosophes, la correspondance se fait aussi sur le nom de famille.

---

## Navigation et recherche

**Recherche floue.** Porte sur le titre, la catégorie, la définition, les tags et le contenu complet. Synonymes philosophiques pris en compte. Historique des huit dernières recherches.

**Recherche dans l'article.** Indépendante de la recherche globale : surligne et fait défiler les occurrences d'un mot à l'intérieur de l'article courant (voir la section Lecture).

**Index alphabétique.** Barre de lettres : sidebar au bureau, bande horizontale sur mobile. Seules les lettres ayant des articles sont actives.

**Filtres par catégorie.** Sous forme de chips, dans la barre de recherche et dans le tiroir mobile.

**Tri.** Alphabétique (par nom de famille pour les personnes), par catégorie, non lus d'abord, ou récemment lus.

**Navigation entre articles.** Boutons précédent / suivant, raccourcis clavier, et balayage horizontal sur mobile.

**Pile de retour.** Bouton retour logiciel et bouton matériel Android, qui ferment d'abord les panneaux ouverts puis remontent dans l'historique de lecture, sans jamais fermer l'application par accident.

**Index des philosophes.** Grille de tous les philosophes mentionnés dans les articles, avec compteur d'occurrences.

---

## Page d'accueil

L'accueil rassemble, de haut en bas :

- l'ornement φιλοσοφία et le sous-titre ;
- le compteur d'articles et la barre de progression de lecture ;
- la carte *Continuer la lecture* (dernier article ouvert) ;
- quatre boutons rapides : Recherche, Index, Hasard, Favoris ;
- le bandeau de mise à jour Wikilivres, le cas échéant ;
- l'article du jour (sélection quotidienne déterministe) ;
- onze parcours thématiques guidés ;
- les dernières mises à jour (cinq articles les plus récemment révisés) ;
- le bouton d'import.

Les onze parcours thématiques sont : **Éthique et morale**, **Théorie de la connaissance**, **Philosophie des sciences**, **Philosophie de l'esprit**, **Existence et métaphysique**, **Liberté et action**, **Philosophie politique**, **Nature, culture et technique**, **Religion et transcendance**, **Langage et logique**, **Esthétique**. Chacun regroupe les articles pertinents par correspondance de mots-clés pondérée.

Cliquer sur un parcours ouvre un panneau de présentation : une introduction pédagogique qui pose la question directrice, la liste numérotée des articles (avec coches pour ceux déjà lus et indication de progression), et un bouton « Commencer le parcours » / « Reprendre » / « Revoir ». Des concepts d'ancrage placent les notions fondamentales en tête du trajet. Pendant la lecture d'un parcours, un bandeau indique la progression et permet de passer à l'article suivant.

---

## Apparence

Tous les réglages sont accessibles via le bouton ⚙ en haut à droite de l'accueil.

**Thèmes.** Clair, sombre, sépia. Le thème système est détecté au premier lancement.

**Couleurs d'accent.** Huit teintes : grenat, marine, forêt, prune, ambre, bordeaux, sarcelle, ardoise.

**Polices de lecture.** Source Serif 4 (par défaut), Lora, Libre Baskerville, Crimson Text, EB Garamond, Cormorant Garamond, JetBrains Mono, ou police système.

**Réglages typographiques.** Taille du texte (80–140 %), interligne (150–230 %), largeur de colonne (500–900 px), espacement des paragraphes, justification, indentation des paragraphes, lettrine.

**Accessibilité.** Taille de police minimale d'environ 15 px partout, contrastes conformes WCAG AA dans les trois thèmes (minimum 5,9:1), aucun texte en opacité réduite, graisse minimale de 400.

---

## Outils

Regroupés dans le panneau de réglages :

| Outil | Fonction |
|---|---|
| **Philosophes** | Index de tous les philosophes mentionnés |
| **Glossaire** | Termes fondamentaux avec définitions courtes |
| **Statistiques** | Articles lus, répartition par catégorie, temps de lecture |
| **Mises à jour** | Vérification et application des révisions Wikilivres |
| **Éditeur** | Création et modification d'articles en MediaWiki, import individuel, aperçu |
| **Export** | Sauvegarde JSON ou génération EPUB |
| **Import** | Restauration depuis une sauvegarde JSON |
| **Recatégoriser** | Réextraction des catégories Wikilivres |
| **Re-traiter** | Re-analyse complète des articles depuis leur source |

---

## Raccourcis clavier

| Touche | Action |
|---|---|
| `/` | Ouvrir la recherche globale |
| `Ctrl/Cmd + F` | Rechercher dans l'article (en lecture) |
| `Entrée` / `Maj + Entrée` | Occurrence suivante / précédente (recherche dans l'article) |
| `Échap` | Fermer la recherche ou le panneau actif |
| `←` `→` | Article précédent / suivant |
| `R` | Article au hasard |
| `Retour arrière` | Remonter dans l'historique |
| `↑` `↓` `Entrée` | Naviguer dans les suggestions de recherche |

---

## Build Android

Le dossier `capacitor-project/` contient tout le nécessaire pour produire un APK natif.

```
capacitor-project/
├── www/
│   └── index.html              copie de l'application
├── android-icons/
│   ├── mdpi/ hdpi/ xhdpi/ xxhdpi/ xxxhdpi/
│   ├── xml/                    icône adaptative
│   ├── playstore-icon.png      512×512
│   └── web-icon-192.png
├── capacitor.config.json
├── package.json
├── build.sh
└── README.md
```

**Prérequis :** Node.js, JDK 17 ou supérieur, Android SDK.

**Construction :**

```bash
cd capacitor-project
npm install
npx cap add android
chmod +x build.sh
./build.sh
```

**Icône.** φ doré sur fond sombre avec anneau d'accent, déclinée de mdpi à xxxhdpi, avec foreground pour les icônes adaptatives Android.

**Bouton retour matériel.** Géré à la fois par l'événement `popstate` du navigateur et par `Capacitor.Plugins.App.backButton`. L'ordre de fermeture est : réglages → tiroir → mode immersif → sommaire → article précédent → accueil. Sur l'accueil, le bouton ne ferme pas l'application.

**Plugins Capacitor utilisés :** `@capacitor/app`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/local-notifications`, `@capacitor/preferences`.

---

## Architecture

**Fichier unique.** HTML, CSS et JavaScript dans un seul fichier (~385 Ko). Aucune dépendance, aucun bundler, aucune étape de build pour la version web. Les polices sont chargées depuis Google Fonts.

**Stockage.** Les données sont conservées dans IndexedDB (base `PhiloDB`) avec repli sur localStorage. Le WebView Android peut purger localStorage à la fermeture, mais IndexedDB persiste ; au démarrage, les deux sources sont comparées et la plus complète est retenue. Toutes les écritures localStorage sont protégées par try/catch (quota).

**Cache.** La liste complète des articles (`getAllEntries()`) est mise en cache et invalidée explicitement à chaque mutation. Le temps de lecture est mémorisé sur l'objet article. La barre latérale n'est pas recalculée sur mobile, où le tiroir la remplace.

**Robustesse.** L'initialisation enveloppe chaque étape dans un try/catch isolé, et un gestionnaire d'erreurs global affiche tout incident à l'écran plutôt que de laisser une page blanche.

---

## Le parseur MediaWiki

Le cœur de l'application transforme le wikitext brut en HTML propre.

**Titres.** Quatre niveaux (`=` à `====`). Les sections non pertinentes pour la lecture — *Bibliographie*, *Notes et références*, *Voir aussi*, *Articles connexes*, *Liens externes*, *Sources primaires*, *Études* — sont détectées et traitées séparément : la bibliographie alimente les références, le reste est écarté du corps.

**Références.** Extraction en trois passes pour gérer correctement les références nommées réutilisées. Une référence peut être appelée (`<ref name="x"/>`) avant d'être définie (`<ref name="x">contenu</ref>`) : les balises auto-fermantes sont d'abord protégées par des marqueurs temporaires, les définitions complètes sont ensuite extraites, puis les marqueurs sont résolus une fois toutes les définitions connues. Cela évite qu'une balise auto-fermante soit prise pour une balise ouvrante et n'absorbe le corps du texte. Les références inline sont stockées comme pseudo-balises `<x-ref>`, résolues en exposants cliquables à l'affichage, et automatiquement ignorées par les fonctions de recherche et d'indexation.

**Modèles.** Les modèles français courants sont développés en texte lisible : `{{s-|XX|e}}` devient « XXᵉ siècle », `{{citation|x}}` devient « x », `{{lang|fr|x}}` devient « x ». Le modèle d'en-tête `{{DicoPhilo}}` est retiré. Les modèles bibliographiques (`{{Ouvrage}}`, `{{Article}}`, `{{Chapitre}}`, `{{Lien web}}`) sont formatés en citations : auteur, titre en italique, lieu, éditeur, année, page. Sans cette conversion, le nettoyage générique des modèles laisserait des entrées vides.

**Assemblage des notes.** À l'affichage, les appels de note sont déduplicés par leur texte : une même source citée plusieurs fois donne une seule note avec des liens de retour multiples. Les entrées de bibliographie qui ne sont jamais appelées dans le corps sont regroupées dans un bloc « Bibliographie » distinct, et celles qui répètent une note déjà présente sont écartées. Chaque appel de note reçoit un identifiant unique permettant la navigation aller-retour.

**Liens.** Liens internes `[[Page|texte]]` et externes `[url texte]` convertis en texte ; les liens internes vers d'autres articles deviennent cliquables.

**API.** Seule l'API MediaWiki de `fr.wikibooks.org` est sollicitée, en JSONP. La fonction d'appel vérifie le domaine, impose un délai d'expiration de 10 secondes et nettoie le callback global après usage.

---

## Sécurité

L'application traite du contenu importé depuis le web, donc l'assainissement est systématique.

**`sanitizeHtml()`** retire les balises `<script>`, tous les gestionnaires d'événements `on*`, les URI `javascript:` et `data:` (sauf images), les attributs `style` contenant `expression()` ou `url()`, ainsi que les balises `<iframe>`, `<object>`, `<embed>`, `<form>`, `<meta>`, `<link>`, `<base>`.

**`validateEntry()`** valide la structure des entrées importées, bloque la pollution de prototype (`__proto__`, `constructor`, `prototype`), limite la taille des champs (500 Ko pour le contenu) et assainit le HTML.

**`jsAttr()`** encode une valeur en JSON puis l'échappe pour le HTML, ce qui la rend sûre à l'intérieur d'un attribut `onclick` — y compris si elle contient apostrophes, guillemets ou retours de ligne. Toutes les injections de données utilisateur dans des gestionnaires inline passent par cette fonction.

**`safeId()`** retire les caractères dangereux des identifiants utilisés dans les attributs `onclick`.

**`escapeHtml()` / `escapeAttr()`** échappent systématiquement le contenu utilisateur affiché.

L'application n'utilise ni `eval()` ni `new Function()`, et n'injecte jamais de données non échappées dans un contexte JavaScript via un attribut HTML.

---

## Format des données

Chaque article est un objet :

```json
{
  "id": "user-1709...-a3f2",
  "term": "Maurice Merleau-Ponty",
  "sortName": "Merleau-Ponty",
  "isPerson": true,
  "letter": "M",
  "category": "Philosophe",
  "etymology": "",
  "definition": "Maurice Merleau-Ponty, né à Rochefort-sur-Mer le 14 mars 1908…",
  "content": "<p>…</p>",
  "tags": ["Husserl", "Sartre", "Cézanne"],
  "refs": ["Maurice Merleau-Ponty, Phénoménologie de la perception…"],
  "related": [],
  "_userEntry": true,
  "_wikiSource": "…wikitext nettoyé…",
  "_wikiRaw": "…wikitext brut avec [[Catégorie:…]]…",
  "_wikiRevId": 123456,
  "_wikiTimestamp": "2024-01-15T10:30:00Z",
  "_wikiTitle": "Dictionnaire de philosophie/Maurice Merleau-Ponty",
  "_importDate": "2025-03-01T14:22:00.000Z"
}
```

### Clés de stockage

| Clé | Contenu |
|---|---|
| `philo-user-entries` | Articles importés |
| `philo-bookmarks` | Identifiants des favoris |
| `philo-read` | Identifiants des articles lus |
| `philo-history` | Historique de lecture (id + horodatage) |
| `philo-notes` | Notes par article |
| `philo-highlights` | Surlignages par article |
| `philo-collections` | Collections personnalisées |
| `philo-custom-tags` | Tags personnalisés par article |
| `philo-all-custom-tags` | Liste de tous les tags personnalisés |
| `philo-search-history` | Huit dernières recherches |
| `philo-theme` | Thème (light / dark / sepia) |
| `philo-accent` | Couleur d'accent |
| `philo-body-font` | Police de lecture |
| `philo-fontsize` | Taille du texte |
| `philo-line-height` | Interligne |
| `philo-text-width` | Largeur de colonne |
| `philo-para-spacing` | Espacement des paragraphes |
| `philo-justify` | Justification |
| `philo-indent` | Indentation |
| `philo-lettrine` | Lettrine |
| `philo-highlight-mode` | Mode surlignage actif |
| `philo-sort` | Mode de tri |
| `philo-reading-times` | Temps passé par article |
| `philo-scroll-pos` | Position de défilement par article |
| `philo-parcours-progress` | Progression des parcours |
| `philo-active-parcours` | Parcours en cours |
| `philo-pending-updates` | Mises à jour en attente |
| `philo-last-update-check` | Date de la dernière vérification |
| `philo-onboarded` | Premier lancement effectué |

---

## Dépannage

**La page d'accueil est vide.** Un gestionnaire d'erreurs global affiche désormais tout incident JavaScript directement à l'écran, avec le message et la pile d'appels. En cas de page blanche, le message d'erreur devrait apparaître à la place ; un bouton *Recharger* est proposé.

**Des doublons sont apparus.** Le dédoublonnage automatique s'exécute au démarrage. Si des doublons subsistent, recharger l'application suffit généralement.

**Du texte manque ou se retrouve dans les notes.** Ce symptôme correspond à un ancien bug du parseur, corrigé. Utiliser ⚙ Réglages → Outils → **Re-traiter** pour réappliquer le parseur à jour, ou ré-importer les articles concernés.

**Les philosophes sont mal classés.** Le classement par nom de famille a été ajouté. Pour l'appliquer aux articles déjà importés, utiliser **Re-traiter**.

**Des notes vides ou en double dans la section des notes.** Corrigé. Les notes vides venaient de modèles bibliographiques non gérés, désormais formatés ; les doublons venaient du mélange entre notes et bibliographie, désormais séparés. Utiliser **Re-traiter** pour mettre à jour les articles déjà importés.

**Des appels de note détachés du texte sur certaines lignes.** Corrigé (problème d'affichage purement CSS) : les exposants restent collés à leur mot. Aucune action requise, la correction s'applique au rechargement.

**L'application Android se ferme au bouton retour.** Corrigé : le bouton ferme d'abord les panneaux puis remonte dans l'historique. Vérifier que le plugin `@capacitor/app` est bien installé.

**Le stockage semble plein.** Toutes les écritures sont protégées. En cas de quota dépassé, exporter une sauvegarde JSON, puis vider et réimporter.

---

## Historique des changements

Les versions sont datées ; l'application étant un fichier unique, chaque entrée correspond à un état déployé du fichier `dictionnaire-philosophie.html`.

### Notes et bibliographie

- **Appels de note bidirectionnels.** Chaque exposant `[n]` renvoie à sa note, et chaque note renvoie à l'endroit du texte par une flèche `↑`. Une source citée plusieurs fois est regroupée en une note unique avec des retours `a`, `b`, `c`. La cible clignote à l'arrivée.
- **Séparation notes / bibliographie.** Les notes appelées dans le texte et la bibliographie de l'article forment désormais deux blocs distincts, ce qui supprime l'impression de doublons.
- **Formatage des modèles bibliographiques.** `{{Ouvrage}}`, `{{Article}}`, `{{Chapitre}}` et `{{Lien web}}` sont convertis en citations lisibles. Cela corrige l'apparition de notes vides (les modèles étaient auparavant supprimés sans remplacement) et fait apparaître la bibliographie qui était invisible.
- **Appels de note collés.** Correction d'un défaut d'affichage où les exposants pouvaient se détacher de leur mot en fin de ligne (cause : `display:inline-block` créant un point de coupure).

### Lecture

- **Aperçu d'un terme** au survol ou à l'appui prolongé sur un terme auto-lié.
- **Recherche dans l'article** (`Ctrl/Cmd+F`) avec surlignage des correspondances, compteur et navigation entre occurrences ; surlignage automatique à l'ouverture depuis la recherche globale.
- **Références inverses (« Cité dans »)** listant les articles qui mentionnent l'article courant.
- **Pied d'article réagencé** : un seul trait de séparation, des libellés homogènes, et suppression de la rangée « Mots-clés » redondante.

### Parcours thématiques

- Passage de **six à onze parcours**, avec de nouveaux domaines (philosophie des sciences, de l'esprit, liberté et action, nature et culture, religion).
- **Introductions pédagogiques** et **concepts d'ancrage** pour ordonner le trajet.
- **Panneau de présentation** affiché avant le démarrage, avec liste des articles et progression.

### Classement et import

- **Classement des biographies par nom de famille** (détection automatique des articles de philosophes ; gestion des particules françaises).
- **Outil « Re-traiter »** qui ré-analyse tous les articles depuis leur source stockée avec la dernière version du parseur, en conservant notes, favoris et surlignages.
- **Déduplication renforcée** à l'import et au démarrage.

### Parseur

- **Extraction des références en trois passes** corrigeant les sections et fragments de texte qui se retrouvaient piégés dans les notes (références nommées appelées avant d'être définies).
- **Développement des modèles français** (siècles, ordinaux, citations, langues) avec remplacement par du texte lisible.
- **Filtrage des sections** non pertinentes pour la lecture (Voir aussi, Liens externes, etc.).

### Stabilité et sécurité

- **Gestionnaire d'erreurs global** affichant tout incident à l'écran, et initialisation tolérante aux pannes (chaque étape isolée).
- Correction de deux bugs provoquant une **page blanche** (mot réservé `protected` en mode strict ; récursion infinie d'une fonction utilitaire).
- **Durcissement XSS** : introduction de `jsAttr()` (encodage JSON puis échappement HTML) pour toute donnée injectée dans un gestionnaire `onclick`, correction de plusieurs points d'injection, assainissement systématique du contenu importé.
- Correction d'une **fuite mémoire** (écouteur de défilement du sommaire ajouté à chaque article sans être retiré).

---

## Licence

Les articles importés depuis Wikilivres sont diffusés sous licence [Creative Commons BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/deed.fr). Toute réutilisation doit en respecter les termes (attribution et partage dans les mêmes conditions).
