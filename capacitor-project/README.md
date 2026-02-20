# Dictionnaire de Philosophie — Application Android

Application mobile offline du Dictionnaire de philosophie des Wikilivres, compilée avec Capacitor.

## Prérequis

- **Node.js** ≥ 18 — [nodejs.org](https://nodejs.org)
- **Android Studio** — [developer.android.com](https://developer.android.com/studio)
  - SDK Android 34 (Android 14)
  - Build Tools 34.x
  - Java JDK 17 (inclus dans Android Studio)
- **ImageMagick** (optionnel, pour les icônes) — `brew install imagemagick` / `apt install imagemagick`

## Structure

```
capacitor-project/
├── www/
│   └── index.html          ← Application (fichier unique)
├── resources/
│   └── icon.svg            ← Icône source
├── capacitor.config.json   ← Configuration Capacitor
├── package.json            ← Dépendances
├── build.sh                ← Script de compilation automatique
├── generate-icons.sh       ← Génération des icônes Android
└── android/                ← (généré automatiquement)
```

## Compilation rapide

```bash
# Rendre les scripts exécutables
chmod +x build.sh generate-icons.sh

# Compiler un APK debug (installe les dépendances automatiquement)
./build.sh

# Compiler un APK release signé
./build.sh release
```

Le script `build.sh` fait tout automatiquement :
1. Vérifie l'environnement
2. Installe les dépendances npm
3. Initialise le projet Android (si nécessaire)
4. Configure les couleurs, styles et strings Android
5. Synchronise les fichiers web
6. Compile l'APK

## Compilation manuelle

```bash
# 1. Installer les dépendances
npm install

# 2. Ajouter la plateforme Android
npx cap add android

# 3. Synchroniser les fichiers web → Android
npx cap sync android

# 4. Générer les icônes (optionnel)
./generate-icons.sh

# 5a. Ouvrir dans Android Studio
npx cap open android

# 5b. Ou compiler en ligne de commande
cd android
./gradlew assembleDebug      # APK debug
./gradlew assembleRelease    # APK release (nécessite signing)
```

L'APK se trouve dans :
```
android/app/build/outputs/apk/debug/app-debug.apk
android/app/build/outputs/apk/release/app-release.apk
```

## Installation sur appareil

```bash
# Via ADB (appareil connecté en USB, débogage activé)
adb install dictionnaire-philosophie-debug.apk

# Ou transférer le fichier .apk sur le téléphone et l'installer
```

## Signature Release

Le script `build.sh release` génère automatiquement un keystore si aucun n'existe.
Pour utiliser votre propre keystore :

```bash
# Placer votre keystore à la racine
cp /chemin/vers/mon-keystore.jks ./keystore.jks

# Modifier les credentials dans build.sh ou gradle.properties
```

## Personnalisation

### Icône
Modifier `resources/icon.svg` puis exécuter `./generate-icons.sh`.

### Nom de l'app
Modifier dans `capacitor.config.json` (`appName`) et `build.sh` (strings.xml).

### Couleurs
Les couleurs du thème sont dans `build.sh` (section colors.xml) :
- `colorPrimary` : #8B2500 (accent brun)
- `colorPrimaryDark` : #1a1610 (fond sombre)
- `colorAccent` : #d4a843 (or)

### Contenu
Remplacer `www/index.html` par la version souhaitée, puis :
```bash
npx cap sync android
./build.sh
```

## Fonctionnalités de l'app

- Import automatique depuis Wikilivres (JSONP, sans CORS)
- Lecture offline complète
- Thème clair/sombre
- Recherche fuzzy avec suggestions
- Table des matières flottante
- Graphe de relations interactif
- Notes de bas de page cliquables
- Export/import JSON de la base
- Suivi de lecture (lus/non lus)
- Swipe entre articles
- Index des philosophes
