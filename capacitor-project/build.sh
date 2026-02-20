#!/bin/bash
# ===========================================================
#  Dictionnaire de Philosophie — Build APK avec Capacitor
# ===========================================================
#
#  Prérequis :
#    - Node.js >= 18
#    - Android Studio (ou SDK Android en ligne de commande)
#    - Java JDK 17+
#    - Variable ANDROID_HOME configurée
#
#  Usage :
#    chmod +x build.sh
#    ./build.sh          → APK debug
#    ./build.sh release  → APK release (nécessite keystore)
#
# ===========================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# 1. Vérifications
command -v node >/dev/null 2>&1 || err "Node.js requis. Installez-le depuis https://nodejs.org"
command -v npx  >/dev/null 2>&1 || err "npx non trouvé. Installez Node.js >= 18"

if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
  if [ -d "$HOME/Android/Sdk" ]; then
    export ANDROID_HOME="$HOME/Android/Sdk"
  elif [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
  else
    warn "ANDROID_HOME non défini. La compilation nécessite le SDK Android."
  fi
fi

log "Environnement vérifié"

# 2. Installation des dépendances
if [ ! -d "node_modules" ]; then
  log "Installation des dépendances npm..."
  npm install
fi
log "Dépendances OK"

# 3. Si un ancien dossier android existe avec des plugins splash,
#    le supprimer pour repartir proprement
if [ -d "android" ]; then
  # Vérifier si l'ancien splash plugin est encore présent
  if grep -rq "splashBackground" android/app/src/main/res/ 2>/dev/null; then
    warn "Ancien projet Android détecté avec plugin splash. Suppression..."
    rm -rf android
  fi
fi

# 4. Ajouter la plateforme Android si nécessaire
if [ ! -d "android" ]; then
  log "Ajout de la plateforme Android..."
  npx cap add android
fi
log "Plateforme Android présente"

# 5. Synchroniser les fichiers web → Android
log "Synchronisation des fichiers web..."
npx cap sync android
log "Sync OK"

# ============================================================
#  6. Personnalisations Android (APRÈS sync)
# ============================================================
log "Application des personnalisations Android..."

ANDROID_RES="android/app/src/main/res"

# 6a. Couleurs
cat > "$ANDROID_RES/values/colors.xml" << 'COLORS'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#8B2500</color>
    <color name="colorPrimaryDark">#1a1610</color>
    <color name="colorAccent">#d4a843</color>
</resources>
COLORS
log "  colors.xml ✓"

# 6b. Strings
cat > "$ANDROID_RES/values/strings.xml" << 'STRINGS'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Philo</string>
    <string name="title_activity_main">Dictionnaire de Philosophie</string>
    <string name="package_name">com.philosophie.dictionnaire</string>
    <string name="custom_url_scheme">com.philosophie.dictionnaire</string>
</resources>
STRINGS
log "  strings.xml ✓"

# 6c. Styles — N'utilise QUE des couleurs définies dans colors.xml
cat > "$ANDROID_RES/values/styles.xml" << 'STYLES'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
        <item name="android:windowBackground">@color/colorPrimaryDark</item>
        <item name="android:navigationBarColor">@color/colorPrimaryDark</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
        <item name="android:windowBackground">@color/colorPrimaryDark</item>
        <item name="android:navigationBarColor">@color/colorPrimaryDark</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:windowBackground">@color/colorPrimaryDark</item>
        <item name="android:navigationBarColor">@color/colorPrimaryDark</item>
    </style>
</resources>
STYLES
log "  styles.xml ✓"

# 6d-bis. Copier les icônes de l'application
ICON_SRC="android-icons"
if [ -d "$ICON_SRC" ]; then
  for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    TARGET_DIR="$ANDROID_RES/mipmap-$density"
    mkdir -p "$TARGET_DIR"
    if [ -f "$ICON_SRC/$density/ic_launcher.png" ]; then
      cp "$ICON_SRC/$density/ic_launcher.png" "$TARGET_DIR/ic_launcher.png"
      cp "$ICON_SRC/$density/ic_launcher.png" "$TARGET_DIR/ic_launcher_foreground.png"
    fi
    if [ -f "$ICON_SRC/$density/ic_launcher_round.png" ]; then
      cp "$ICON_SRC/$density/ic_launcher_round.png" "$TARGET_DIR/ic_launcher_round.png"
    fi
  done
  log "  icônes ✓ (φ sur fond sombre)"
else
  warn "  Dossier android-icons/ absent, icônes par défaut conservées"
fi

# 6e. Widget Android : Article du jour
WIDGET_PKG="android/app/src/main/java/com/philosophie/dictionnaire"
mkdir -p "$WIDGET_PKG"
mkdir -p "$ANDROID_RES/layout"
mkdir -p "$ANDROID_RES/xml"
mkdir -p "$ANDROID_RES/drawable"

cat > "$ANDROID_RES/layout/widget_article_du_jour.xml" << 'WIDGET_LAYOUT'
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent" android:layout_height="match_parent"
    android:orientation="vertical" android:padding="12dp"
    android:background="@drawable/widget_bg">
    <TextView android:id="@+id/widget_badge" android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:text="φ · Article du jour" android:textColor="#d4a843" android:textSize="10sp" android:fontFamily="monospace" android:letterSpacing="0.08" android:textAllCaps="true"/>
    <TextView android:id="@+id/widget_title" android:layout_width="match_parent" android:layout_height="wrap_content"
        android:text="Philosophie" android:textColor="#f5f0e8" android:textSize="20sp" android:textStyle="bold" android:layout_marginTop="4dp" android:fontFamily="serif"/>
    <TextView android:id="@+id/widget_excerpt" android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="1"
        android:text="Ouvrez l'application" android:textColor="#a09880" android:textSize="12sp" android:layout_marginTop="6dp" android:maxLines="4" android:ellipsize="end" android:lineSpacingMultiplier="1.3"/>
    <TextView android:id="@+id/widget_tap" android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:text="Toucher pour lire →" android:textColor="#8b2500" android:textSize="10sp" android:fontFamily="monospace" android:layout_marginTop="4dp"/>
</LinearLayout>
WIDGET_LAYOUT

cat > "$ANDROID_RES/drawable/widget_bg.xml" << 'WIDGET_BG'
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#1a1610"/><corners android:radius="16dp"/><stroke android:width="1dp" android:color="#2e2a24"/>
</shape>
WIDGET_BG

cat > "$ANDROID_RES/xml/widget_info.xml" << 'WIDGET_INFO'
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp" android:minHeight="110dp"
    android:updatePeriodMillis="86400000"
    android:initialLayout="@layout/widget_article_du_jour"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:previewImage="@mipmap/ic_launcher"/>
WIDGET_INFO

cat > "$WIDGET_PKG/ArticleDuJourWidget.java" << 'WIDGET_JAVA'
package com.philosophie.dictionnaire;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class ArticleDuJourWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String title = prefs.getString("aotd_title", "Philosophie");
            String excerpt = prefs.getString("aotd_excerpt", "Ouvrez l'application pour découvrir l'article du jour.");
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_article_du_jour);
            views.setTextViewText(R.id.widget_title, title);
            views.setTextViewText(R.id.widget_excerpt, excerpt);
            Intent intent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (intent != null) {
                PendingIntent pending = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                views.setOnClickPendingIntent(R.id.widget_root, pending);
            }
            manager.updateAppWidget(id, views);
        }
    }
}
WIDGET_JAVA

# Enregistrer le widget dans AndroidManifest
MANIFEST="android/app/src/main/AndroidManifest.xml"
if [ -f "$MANIFEST" ] && ! grep -q "ArticleDuJourWidget" "$MANIFEST"; then
  sed -i 's|</application>|        <receiver android:name=".ArticleDuJourWidget" android:exported="true">\n            <intent-filter>\n                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />\n            </intent-filter>\n            <meta-data android:name="android.appwidget.provider" android:resource="@xml/widget_info" />\n        </receiver>\n    </application>|' "$MANIFEST"
  log "  widget article du jour ✓"
fi

# 6d. Supprimer toute référence résiduelle à splashBackground
#     dans les fichiers générés par d'anciens plugins
find "$ANDROID_RES" -name "*.xml" -exec grep -l "splashBackground" {} \; 2>/dev/null | while read f; do
  warn "  Nettoyage de $f (suppression ref splashBackground)"
  sed -i 's|@color/splashBackground|@color/colorPrimaryDark|g' "$f"
done

log "Personnalisations appliquées"

# 7. Nettoyer le cache Gradle (évite les artefacts de builds précédents)
log "Nettoyage du cache Gradle..."
cd android && ./gradlew clean 2>/dev/null && cd ..
log "Cache nettoyé"

# 8. Compiler l'APK
BUILD_TYPE="${1:-debug}"

if [ "$BUILD_TYPE" = "release" ]; then
  KEYSTORE="keystore.jks"
  ALIAS="philosophie"

  if [ ! -f "$KEYSTORE" ]; then
    warn "Aucun keystore trouvé. Génération d'un nouveau keystore..."
    keytool -genkeypair \
      -v \
      -keystore "$KEYSTORE" \
      -alias "$ALIAS" \
      -keyalg RSA \
      -keysize 2048 \
      -validity 10000 \
      -storepass philosophie2024 \
      -keypass philosophie2024 \
      -dname "CN=Dictionnaire de Philosophie, OU=Dev, O=Philo, L=Paris, ST=IDF, C=FR"
    log "Keystore généré : $KEYSTORE (mot de passe : philosophie2024)"
  fi

  GRADLE_PROPS="android/gradle.properties"
  sed -i '/^RELEASE_/d' "$GRADLE_PROPS" 2>/dev/null || true
  cat >> "$GRADLE_PROPS" << GRADLE
RELEASE_STORE_FILE=../../${KEYSTORE}
RELEASE_STORE_PASSWORD=philosophie2024
RELEASE_KEY_ALIAS=${ALIAS}
RELEASE_KEY_PASSWORD=philosophie2024
GRADLE

  BUILD_GRADLE="android/app/build.gradle"
  if ! grep -q "signingConfigs" "$BUILD_GRADLE"; then
    sed -i '/android {/a\
    signingConfigs {\
        release {\
            storeFile file(RELEASE_STORE_FILE)\
            storePassword RELEASE_STORE_PASSWORD\
            keyAlias RELEASE_KEY_ALIAS\
            keyPassword RELEASE_KEY_PASSWORD\
        }\
    }' "$BUILD_GRADLE"

    sed -i 's/buildTypes {/buildTypes {\n        release {\n            signingConfig signingConfigs.release\n        }/' "$BUILD_GRADLE"
  fi

  log "Compilation release..."
  cd android && ./gradlew assembleRelease
  APK_PATH=$(find . -name "*release*.apk" -type f | head -1)
  cd ..

  if [ -n "$APK_PATH" ]; then
    cp "android/$APK_PATH" "./dictionnaire-philosophie-release.apk"
    log "APK release : ./dictionnaire-philosophie-release.apk"
    ls -lh "./dictionnaire-philosophie-release.apk"
  else
    err "APK release non trouvé"
  fi

else
  log "Compilation debug..."
  cd android && ./gradlew assembleDebug
  APK_PATH=$(find . -name "*debug*.apk" -type f | head -1)
  cd ..

  if [ -n "$APK_PATH" ]; then
    cp "android/$APK_PATH" "./dictionnaire-philosophie-debug.apk"
    log "APK debug : ./dictionnaire-philosophie-debug.apk"
    ls -lh "./dictionnaire-philosophie-debug.apk"
  else
    err "APK debug non trouvé"
  fi
fi

log "Terminé !"
echo ""
echo "  Pour installer sur un appareil connecté :"
echo "    adb install dictionnaire-philosophie-${BUILD_TYPE}.apk"
echo ""
echo "  Pour ouvrir dans Android Studio :"
echo "    npx cap open android"
echo ""
