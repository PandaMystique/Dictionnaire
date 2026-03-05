# Dictionnaire de Philosophie

Dictionnaire encyclopédique de philosophie occidentale, de l'Antiquité à la pensée contemporaine. Application monopage (HTML unique) fonctionnant hors ligne, avec import automatique depuis les Wikilivres francophones.

![φ](https://img.shields.io/badge/φ-philosophie-8b2500)

---

## Présentation

L'application se présente comme un fichier HTML autonome de ~350 Ko. Elle ne dépend d'aucun serveur, d'aucun framework, d'aucune base de données externe. Les articles sont stockés localement dans IndexedDB avec un fallback localStorage. L'interface est intégralement en français.

Elle est conçue pour deux usages : naviguer dans un corpus philosophique structuré et lire des articles longs dans un confort typographique soigné.


## Fonctionnalités

### Import et synchronisation

- **Import depuis Wikilivres** — Récupération automatique de tous les articles du *Dictionnaire de philosophie* hébergé sur `fr.wikibooks.org`, via JSONP (sans CORS).
- **Import individuel** — Saisie d'un terme dans l'éditeur pour importer un article précis depuis Wikilivres.
- **Mises à jour silencieuses** — Au lancement, l'application compare les révisions locales avec Wikilivres et signale les articles modifiés en amont. La mise à jour se fait en un clic depuis le bandeau d'accueil.
- **Catégories Wikilivres** — Les catégories sont extraites directement du markup wiki (`[[Catégorie:...]]`). Aucune catégorie n'est inventée : si l'article source n'en a pas, le champ reste vide.
- **Export / Import JSON** — Sauvegarde complète (articles, favoris, historique de lecture) dans un fichier JSON portable.
- **Export EPUB** — Génération d'un livre numérique EPUB contenant tous les articles, avec table des matières, feuille de style et métadonnées.

### Lecture

- **Parseur MediaWiki** — Conversion fidèle du wikitext en HTML : titres (`=` à `====`), listes, citations, gras/italique, liens internes, notes de bas de page, bibliographie séparée.
- **Lettrine** — Premier caractère du premier paragraphe en lettrine décorative (désactivable).
- **Hyphenation** — Césure automatique via `hyphens: auto` pour un texte justifié propre.
- **Sommaire flottant** — Table des matières latérale (desktop) ou dépliable (mobile) avec scroll spy.
- **Mode focus** — Masque la sidebar et le chrome pour ne garder que l'article, pleine largeur.
- **Mode immersif** — Masque également la barre d'outils et la navigation, pour une lecture sans distraction.
- **Lecture audio (TTS)** — Synthèse vocale intégrée via l'API Web Speech, avec contrôle de vitesse.
- **Progression** — Barre de progression en haut de l'écran (mobile), minimap verticale (desktop) indiquant la position dans l'article.
- **Surlignage** — Sélection de texte pour surligner des passages, persistés dans IndexedDB.
- **Notes personnelles** — Zone de texte attachée à chaque article pour prendre des notes.
- **Fiche express** — Résumé structuré en un clic (définition, étymologie, philosophes liés, articles connexes).

### Navigation

- **Recherche floue** — Recherche dans le titre, la catégorie, la définition, les tags et le contenu complet, avec tolérance aux fautes.
- **Historique de recherche** — Les 8 dernières recherches sont mémorisées et proposées quand le champ de recherche est vide.
- **Index alphabétique** — Barre de lettres cliquable (desktop : sidebar, mobile : strip horizontal).
- **Filtres par catégorie** — Chips de filtrage dans la barre de recherche et dans le drawer mobile.
- **Tri** — Quatre modes : alphabétique, par catégorie, non lus d'abord, récemment lus.
- **Navigation par flèches** — Article précédent / suivant via les boutons ou les flèches clavier.
- **Swipe** — Navigation horizontale entre articles sur mobile.
- **Retour arrière** — Pile de navigation avec bouton retour.
- **Liens automatiques** — Les termes du dictionnaire présents dans le corps d'un article deviennent des liens cliquables.
- **Articles liés** — Détection automatique des articles connexes par analyse du contenu.
- **Index des philosophes** — Grille de tous les philosophes mentionnés dans les articles, avec compteur d'occurrences.

### Dashboard (page d'accueil)

- **Continuer la lecture** — Carte reprenant le dernier article lu.
- **Article du jour** — Sélection quotidienne pseudo-aléatoire (déterministe par date).
- **Recommandations** — Suggestions basées sur les catégories et tags des articles récemment lus.
- **Parcours thématiques** — Six parcours guidés (Éthique, Connaissance, Politique, Existence, Langage, Esthétique) avec suivi de progression.
- **Streak de lecture** — Compteur de jours consécutifs avec activité de lecture.
- **Heatmap d'activité** — Grille des 28 derniers jours, style GitHub.
- **Lectures récentes** — Liste des 4 derniers articles consultés.

### Apparence

- **Trois thèmes** — Clair, sombre, sépia. Détection automatique du thème système au premier lancement, avec suivi en temps réel tant que l'utilisateur n'a pas choisi manuellement.
- **Sept couleurs d'accent** — Crimson, forest, navy, plum, slate et autres, appliquées aux liens, boutons et ornements.
- **Six polices de lecture** — Source Serif 4 (défaut), Lora, Libre Baskerville, Crimson Text, EB Garamond, Cormorant Garamond. Chaque police est chargée depuis Google Fonts.
- **Réglages typographiques fins** — Taille du texte (80–140%), interligne (150–230%), largeur de colonne (500–900px), espacement des paragraphes, justification, indentation, lettrine.
- **Conformité WCAG AA** — Tous les ratios de contraste texte/fond dépassent 4.5:1, y compris pour le texte secondaire (`--muted-light`), dans les trois thèmes.

### Données et suivi

- **Suivi de lecture** — Chaque article consulté est marqué comme lu (point indicateur dans les listes).
- **Temps de lecture** — Estimation affichée dans toutes les listes (`contenu ÷ 200 mots/min`).
- **Chronomètre** — Temps réel passé sur chaque article, stocké et affiché dans les statistiques.
- **Statistiques** — Modale avec nombre d'articles lus, pourcentage de progression, répartition par catégorie (barres), qualité des sources (bibliographie, notes/références).
- **Collections** — Classement des articles dans des collections personnalisées (« À relire », « Favoris », et collections libres).
- **Tags personnalisés** — Ajout de tags libres sur chaque article, en complément des tags extraits automatiquement.

### Éditeur

- **Éditeur intégré** — Création et modification d'articles au format MediaWiki, avec aperçu en temps réel.
- **Barre d'outils** — Insertion rapide de gras, italique, titres, listes, citations, liens, notes de bas de page.
- **Import depuis Wikilivres** — Champ de saisie dans l'éditeur pour pré-remplir depuis une page wiki.
- **Détection de doublons** — Avertissement si un article portant le même titre existe déjà.

### Mobile

- **Barre d'onglets** — Navigation par onglets en bas de l'écran (Accueil, Index, Recherche, Favoris, Éditeur).
- **Drawer** — Panneau glissant pour l'index, la recherche et les favoris, avec bande alphabétique.
- **Retour haptique** — Vibration calibrée sur 10 interactions (navigation, favoris, thème, swipe, etc.).
- **Double-tap zoom** — Double-tap sur un paragraphe pour l'agrandir temporairement.
- **Barre de lecture** — Barre contextuelle affichant le titre de l'article en cours, avec boutons retour et favoris.


## Architecture technique

### Fichier unique

Tout le code (HTML, CSS, JavaScript) tient dans un seul fichier `.html`. Pas de bundler, pas de transpilation, pas de dépendances npm. Le fichier peut être ouvert directement dans un navigateur.

### Stockage

Les données sont persistées dans **IndexedDB** (base `PhiloDB`, object store `kv`) avec fallback automatique sur `localStorage`. Les clés de stockage sont préfixées `philo-`. Les articles importés, les favoris, l'historique, les notes, les collections, les réglages d'apparence et les surlignages sont tous stockés localement.

### Parseur MediaWiki

Le parseur gère les constructions suivantes du wikitext :

- Titres `=` à `====` (convertis en `<h3>` / `<h4>`)
- Listes `*` et listes numérotées `#`
- Gras `'''texte'''` et italique `''texte''`
- Liens internes `[[article]]` et externes `[url texte]`
- Citations indentées `: texte`
- Notes `<ref>...</ref>` extraites et rendues en bas de page
- Templates `{{e}}` → `<sup>e</sup>`
- Sections bibliographie et notes détectées et séparées du corps
- Images et liens inter-wiki supprimés au nettoyage

### API externe

Une seule API est utilisée : l'API MediaWiki de `fr.wikibooks.org`, appelée via JSONP pour contourner les restrictions CORS des WebViews Android. Aucune donnée n'est envoyée à un serveur tiers.


## Plateformes

### Navigateur (desktop et mobile)

Ouvrir `dictionnaire-philosophie.html` dans n'importe quel navigateur moderne.

### Android (APK via Capacitor)

Le dossier `capacitor-project/` contient tout le nécessaire pour construire un APK Android :

```
capacitor-project/
├── www/
│   └── index.html          # Copie du fichier principal
├── android-icons/           # Icônes à toutes les densités (mdpi→xxxhdpi)
│   ├── mdpi/
│   ├── hdpi/
│   ├── xhdpi/
│   ├── xxhdpi/
│   ├── xxxhdpi/
│   ├── xml/                 # Adaptive icon XMLs
│   ├── playstore-icon.png   # 512×512
│   └── web-icon-*.png
├── capacitor.config.json
├── package.json
├── build.sh                 # Script de build automatisé
└── README.md
```

**Construction :**

```bash
cd capacitor-project
chmod +x build.sh
./build.sh
```

Le script installe les dépendances, initialise le projet Android, copie les icônes adaptives dans les bons répertoires `mipmap-*`, et lance le build Gradle. Le résultat est un APK dans `android/app/build/outputs/`.

**Prérequis :** Node.js, JDK 17+, Android SDK.

### Icône

L'icône de l'application est un φ (phi) doré sur fond sombre (#1a1610) avec un anneau accent (#8b2500). Elle est générée aux formats suivants : icônes classiques (48–192px), foreground adaptive (108–432px), icône Play Store (512px), favicons web (32px en base64 embarqué dans le HTML, 192px et 512px en fichiers).


## Raccourcis clavier

| Touche | Action |
|--------|--------|
| `/` | Ouvrir la recherche |
| `Échap` | Fermer le panneau actif / vider la recherche |
| `←` | Article précédent |
| `→` | Article suivant |
| `Retour arrière` | Revenir à l'article précédent (pile de navigation) |


## Données

### Clés de stockage (IndexedDB / localStorage)

| Clé | Contenu |
|-----|---------|
| `philo-user-entries` | Articles importés (JSON) |
| `philo-bookmarks` | Liste des IDs favoris |
| `philo-read` | Set des IDs lus |
| `philo-history` | Historique de lecture (ID + timestamp) |
| `philo-notes` | Notes par article |
| `philo-highlights` | Surlignages par article |
| `philo-collections` | Collections personnalisées |
| `philo-search-history` | 8 dernières recherches |
| `philo-theme` | Thème actif (light/dark/sepia) |
| `philo-body-font` | Police de lecture |
| `philo-fontsize` | Taille de police (%) |
| `philo-line-height` | Interligne (%) |
| `philo-text-width` | Largeur de colonne (px) |
| `philo-accent` | Couleur d'accent |
| `philo-sort` | Mode de tri |
| `philo-reading-times` | Temps passé par article |
| `philo-scroll-pos` | Position de défilement par article |
| `philo-pending-updates` | Nombre de mises à jour en attente |

### Format d'un article

```json
{
  "id": "user-1709...-a3f2",
  "term": "Substance",
  "letter": "S",
  "category": "Métaphysique",
  "etymology": "Du latin substantia…",
  "definition": "Ce qui existe par soi-même…",
  "content": "<p>…</p>",
  "tags": ["Aristote", "Descartes", "Spinoza"],
  "refs": ["Aristote, Métaphysique, Livre VII"],
  "related": [],
  "_userEntry": true,
  "_wikiSource": "…wikitext nettoyé…",
  "_wikiRaw": "…wikitext brut avec [[Catégorie:…]]…",
  "_wikiRevId": 123456,
  "_wikiTimestamp": "2024-01-15T10:30:00Z",
  "_wikiTitle": "Dictionnaire de philosophie/Substance",
  "_importDate": "2025-03-01T14:22:00.000Z"
}
```


## Accessibilité

- Taille de police minimale : `0.88rem` (≈15px à la base de 17px)
- Aucune utilisation de `text-transform: uppercase` ni de `letter-spacing` excessif
- Aucune `opacity` sur du texte — le contraste est géré exclusivement par les couleurs
- Polices à poids 400 minimum pour tout le texte visible
- Contrastes WCAG AA validés dans les trois thèmes (minimum 5.9:1 pour le texte le plus clair)
- Cibles tactiles ≥ 44px sur mobile
- Support complet du thème sombre système


## Licence

Les articles importés depuis Wikilivres sont sous licence [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/deed.fr).
