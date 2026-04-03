# Dictionnaire de Philosophie

Application monopage (fichier HTML unique, ~335 Ko) pour consulter hors ligne les articles du *Dictionnaire de philosophie* de Wikilivres. Interface en français, stockage local, aucun serveur requis.

---

## Utilisation

Ouvrir `dictionnaire-philosophie.html` dans un navigateur. Au premier lancement, cliquer **Importer depuis Wikilivres** pour télécharger les articles. L'application fonctionne ensuite entièrement hors ligne.

Sur Android, le dossier `capacitor-project/` permet de construire un APK natif (voir la section *Android*).


## Import et synchronisation

L'application récupère les articles depuis l'API MediaWiki de `fr.wikibooks.org` via JSONP. Les articles sont stockés dans IndexedDB avec fallback localStorage.

- **Import en masse** — Télécharge tous les articles du dictionnaire en une fois, avec barre de progression. Les doublons sont détectés par titre normalisé et par identifiant Wikilivres.
- **Import individuel** — Saisie d'un terme dans l'éditeur pour importer un article précis.
- **Vérification des mises à jour** — Au lancement (silencieuse, toutes les 24 h) et à la demande. Compare les numéros de révision avec Wikilivres et signale les articles modifiés.
- **Catégories** — Extraites du markup wiki (`[[Catégorie:...]]`). Aucune catégorie n'est devinée : si l'article source n'en a pas, le champ reste vide. Un bouton *Recatégoriser* relance l'extraction sur tous les articles.
- **Dédoublonnage automatique** — Au démarrage, les entrées en double sont détectées et la plus récente est conservée.
- **Export JSON** — Sauvegarde complète (articles, favoris, historique, articles lus).
- **Import JSON** — Restauration depuis une sauvegarde, avec fusion sans doublons.
- **Export EPUB** — Livre numérique avec table des matières et feuille de style.


## Lecture

- **Parseur MediaWiki** — Titres (`=` à `====`), listes, citations, gras/italique, liens internes, notes de bas de page, bibliographie.
- **Lettrine** — Premier caractère en lettrine décorative (désactivable).
- **Césure automatique** — `hyphens: auto` pour le texte justifié.
- **Sommaire** — Flottant latéral (desktop) ou dépliable (mobile), avec suivi de position.
- **Mode focus** — Masque la sidebar pour lire en pleine largeur.
- **Mode immersif** — Masque toute la navigation.
- **Lecture audio** — Synthèse vocale (Web Speech API) avec contrôle de vitesse.
- **Barre de progression** — En haut de l'écran (mobile) et minimap verticale (desktop).
- **Surlignage** — Sélection de texte persistée dans IndexedDB.
- **Notes** — Zone de texte attachée à chaque article.
- **Fiche express** — Résumé structuré (définition, étymologie, philosophes, articles connexes).
- **Auto-liens** — Les termes du dictionnaire dans le corps d'un article deviennent cliquables.
- **Articles liés** — Détection automatique par analyse du contenu.


## Navigation

- **Recherche floue** — Titre, catégorie, définition, tags, contenu. Historique des 8 dernières recherches.
- **Index alphabétique** — Barre de lettres (desktop : sidebar, mobile : strip horizontal).
- **Filtres par catégorie** — Chips dans la barre de recherche et dans le drawer mobile.
- **Tri** — Alphabétique, par catégorie, non lus, récemment lus.
- **Flèches** — Article précédent / suivant, boutons et clavier.
- **Swipe** — Navigation horizontale entre articles sur mobile.
- **Pile de retour** — Bouton retour + bouton Android matériel (ne ferme plus l'application).
- **Index des philosophes** — Grille des philosophes mentionnés, avec compteur.


## Page d'accueil

- Ornement φιλοσοφία et sous-titre
- Compteur d'articles et barre de progression de lecture
- Carte *Continuer la lecture*
- 4 boutons rapides (Recherche, Index, Hasard, Favoris)
- Bandeau de mise à jour Wikilivres (si applicable)
- Article du jour (sélection quotidienne déterministe)
- 6 parcours thématiques (Éthique, Connaissance, Politique, Existence, Langage, Esthétique)
- Dernières mises à jour (5 articles les plus récents par date de révision Wikilivres)
- Bouton d'import


## Apparence

Tous les réglages sont dans le panneau accessible via le bouton ⚙ en haut à droite de l'accueil.

**Thèmes :** clair, sombre, sépia. Détection automatique du thème système au premier lancement.

**Couleurs d'accent :** grenat, marine, forêt, prune, ambre, bordeaux, sarcelle, ardoise.

**Polices de lecture :** Source Serif 4 (défaut), Lora, Libre Baskerville, Crimson Text, EB Garamond, Cormorant Garamond, JetBrains Mono, système.

**Réglages typographiques :** taille (80–140 %), interligne (150–230 %), largeur de colonne (500–900 px), espacement des paragraphes, justification, indentation, lettrine.

**Accessibilité :** taille minimale 0.85 rem (≈ 15 px), contrastes WCAG AA dans les trois thèmes (minimum 5.9:1), aucune opacity sur du texte, poids 400 minimum.


## Outils

Accessibles depuis le panneau de réglages :

- **Philosophes** — Index de tous les philosophes mentionnés
- **Glossaire** — Termes fondamentaux avec définitions courtes
- **Statistiques** — Articles lus, répartition par catégorie, temps de lecture
- **Mises à jour** — Vérification et application des mises à jour Wikilivres
- **Éditeur** — Création et modification d'articles (MediaWiki), import individuel, aperçu
- **Export / Import** — JSON et EPUB
- **Recatégoriser** — Réextraction des catégories Wikilivres


## Raccourcis clavier

| Touche | Action |
|---|---|
| `/` | Recherche |
| `Échap` | Fermer le panneau actif |
| `←` `→` | Article précédent / suivant |
| `Retour arrière` | Retour dans l'historique |


## Android

Le dossier `capacitor-project/` contient :

```
capacitor-project/
├── www/index.html
├── android-icons/
│   ├── mdpi/ hdpi/ xhdpi/ xxhdpi/ xxxhdpi/
│   ├── xml/                    (adaptive icon)
│   ├── playstore-icon.png      (512×512)
│   └── web-icon-192.png
├── capacitor.config.json
├── package.json
├── build.sh
└── README.md
```

**Construction :**

```bash
cd capacitor-project
npm install
npx cap add android
chmod +x build.sh
./build.sh
```

Prérequis : Node.js, JDK 17+, Android SDK.

**Icône :** φ doré sur fond sombre avec anneau accent, aux densités mdpi à xxxhdpi, avec foreground adaptive icon.

**Bouton retour Android :** ferme les overlays ouverts (réglages, drawer, mode immersif, sommaire), puis navigue en arrière dans les articles, puis reste sur l'accueil sans fermer l'application. Géré à la fois par `popstate` et par `Capacitor.Plugins.App.backButton`.

**Plugins Capacitor :** `@capacitor/app`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/local-notifications`, `@capacitor/preferences`.


## Architecture

### Fichier unique

HTML + CSS (88 Ko) + JS (221 Ko) dans un seul fichier. Pas de dépendances, pas de bundler. Les polices sont chargées depuis Google Fonts.

### Stockage

Persistance dans IndexedDB (base `PhiloDB`, object store `kv`) avec fallback localStorage. Android WebView peut effacer localStorage à la fermeture ; IndexedDB persiste. Au démarrage, les données IDB sont comparées à localStorage et la version la plus complète est conservée.

### Parseur MediaWiki

Gère les titres `=` à `====`, listes `*` et `#`, gras/italique, liens internes et externes, citations `:`, notes `<ref>`, templates `{{e}}`. Les sections *Bibliographie*, *Notes et références*, *Voir aussi*, *Articles connexes* et *Liens externes* sont détectées et traitées séparément (bibliographie extraite, le reste filtré du corps).

### API

Seule l'API MediaWiki de `fr.wikibooks.org` est utilisée, via JSONP. La fonction `jsonp()` vérifie le domaine, impose un timeout de 10 s, et nettoie le callback global.

### Sécurité

- `sanitizeHtml()` : suppression de `<script>`, event handlers `on*`, URIs `javascript:` et `data:` (sauf images), `<iframe>`/`<object>`/`<embed>`/`<form>`, attributs `style` avec `expression()`/`url()`.
- `validateEntry()` : validation de structure, protection prototype pollution (`__proto__`, `constructor`), limitation de taille (500 Ko par champ), sanitisation du contenu HTML.
- `safeId()` : échappement des identifiants pour injection dans les attributs `onclick`.
- `escapeHtml()` / `escapeAttr()` : échappement systématique du contenu utilisateur.
- JSONP verrouillé sur `fr.wikibooks.org`.
- Zéro `eval()`, zéro `new Function()`.

### Cache

`getAllEntries()` est caché et invalidé explicitement lors de chaque mutation de `userEntries`. `getReadTime()` met en cache le résultat sur l'objet entry. La sidebar n'est pas recalculée sur mobile (le drawer la remplace).


## Clés de stockage

| Clé | Contenu |
|---|---|
| `philo-user-entries` | Articles importés |
| `philo-bookmarks` | IDs des favoris |
| `philo-read` | IDs des articles lus |
| `philo-history` | Historique de lecture (ID + timestamp) |
| `philo-notes` | Notes par article |
| `philo-highlights` | Surlignages par article |
| `philo-collections` | Collections personnalisées |
| `philo-custom-tags` | Tags personnalisés par article |
| `philo-search-history` | 8 dernières recherches |
| `philo-theme` | Thème (light / dark / sepia) |
| `philo-body-font` | Police de lecture |
| `philo-fontsize` | Taille (%) |
| `philo-line-height` | Interligne (%) |
| `philo-text-width` | Largeur de colonne (px) |
| `philo-para-spacing` | Espacement des paragraphes (%) |
| `philo-accent` | Couleur d'accent |
| `philo-justify` | Justification |
| `philo-indent` | Indentation |
| `philo-lettrine` | Lettrine |
| `philo-sort` | Mode de tri |
| `philo-reading-times` | Temps passé par article |
| `philo-scroll-pos` | Position de défilement par article |
| `philo-parcours-progress` | Progression des parcours |
| `philo-pending-updates` | Mises à jour en attente |
| `philo-last-update-check` | Date dernière vérification |


## Format d'un article

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


## Licence

Les articles importés depuis Wikilivres sont sous licence [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/deed.fr).
