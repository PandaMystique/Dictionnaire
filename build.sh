#!/bin/bash
set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

command -v node >/dev/null 2>&1 || err "Node.js requis"
command -v npx  >/dev/null 2>&1 || err "npx non trouvé"

# --- Capacitor 8 cibles (un seul endroit à mettre à jour quand Capacitor relève ses minimums) ---
CAP8_MIN_SDK=24
CAP8_COMPILE_SDK=36
CAP8_TARGET_SDK=36
CAP8_GRADLE=8.14.3
CAP8_AGP=8.13.0

# Capacitor 8 exige Node 22+ et JDK 21. On échoue tôt plutôt que de laisser Gradle
# produire une erreur obscure plus loin.
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
[ "$NODE_MAJOR" -ge 22 ] || err "Capacitor 8 requiert Node 22+. Détecté : $(node --version 2>/dev/null). Installe Node 22 (nvm install 22, ou paquet LTS)."
if command -v java >/dev/null 2>&1; then
  JAVA_MAJOR=$(java -version 2>&1 | head -1 | sed -E 's/.*version "([0-9]+).*/\1/')
  [ "${JAVA_MAJOR:-0}" -ge 21 ] 2>/dev/null || warn "JDK 21 recommandé pour Capacitor 8 (détecté : ${JAVA_MAJOR:-inconnu}). Le build Gradle pourrait échouer."
else
  warn "java introuvable — JDK 21 nécessaire pour compiler l'APK."
fi

# Applique les versions Android cibles au projet généré (filet de sécurité : le CLI v8
# les pose normalement déjà, ceci corrige le cas où un plugin imposerait une valeur plus basse).
enforce_android_versions() {
  local VARS="android/variables.gradle"
  if [ -f "$VARS" ]; then
    sed -i -E "s/minSdkVersion = [0-9]+/minSdkVersion = ${CAP8_MIN_SDK}/" "$VARS"
    sed -i -E "s/compileSdkVersion = [0-9]+/compileSdkVersion = ${CAP8_COMPILE_SDK}/" "$VARS"
    sed -i -E "s/targetSdkVersion = [0-9]+/targetSdkVersion = ${CAP8_TARGET_SDK}/" "$VARS"
    log "variables.gradle : compileSdk ${CAP8_COMPILE_SDK} / minSdk ${CAP8_MIN_SDK}"
  fi
  local WRAPPER="android/gradle/wrapper/gradle-wrapper.properties"
  if [ -f "$WRAPPER" ]; then
    sed -i -E "s#gradle-[0-9.]+-(all|bin)\.zip#gradle-${CAP8_GRADLE}-all.zip#" "$WRAPPER"
    log "Gradle wrapper : ${CAP8_GRADLE}"
  fi
  local ROOT_GRADLE="android/build.gradle"
  if [ -f "$ROOT_GRADLE" ]; then
    sed -i -E "s#com\.android\.tools\.build:gradle:[0-9.]+#com.android.tools.build:gradle:${CAP8_AGP}#" "$ROOT_GRADLE"
    log "AGP : ${CAP8_AGP}"
  fi
}

if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
  [ -d "$HOME/Android/Sdk" ] && export ANDROID_HOME="$HOME/Android/Sdk"
  [ -d "$HOME/Library/Android/sdk" ] && export ANDROID_HOME="$HOME/Library/Android/sdk"
fi
log "Environnement vérifié"

if [ -f package-lock.json ]; then
  npm ci
else
  warn "package-lock.json absent — installation non reproductible. Lance 'npm install' une fois puis commit le package-lock.json généré."
  npm install
fi
log "Dépendances OK"

if [ -d "android" ] && grep -rq "splashBackground" android/app/src/main/res/ 2>/dev/null; then
  if [ "${FORCE_CLEAN_ANDROID:-0}" = "1" ]; then
    warn "Ancien projet détecté — suppression du dossier android (FORCE_CLEAN_ANDROID=1)"
    rm -rf android
  else
    warn "Ancien dossier android détecté (référence 'splashBackground')."
    warn "Il n'est PAS supprimé automatiquement pour préserver d'éventuelles personnalisations natives."
    warn "Pour forcer une reconstruction propre : FORCE_CLEAN_ANDROID=1 ./build.sh"
  fi
fi

[ ! -d "android" ] && npx cap add android
log "Plateforme Android présente"

npx cap sync android
log "Sync OK"

enforce_android_versions

ANDROID_RES="android/app/src/main/res"
cat > "$ANDROID_RES/values/colors.xml" << 'COLORS'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#8B2500</color>
    <color name="colorPrimaryDark">#1a1610</color>
    <color name="colorAccent">#d4a843</color>
</resources>
COLORS
cat > "$ANDROID_RES/values/strings.xml" << 'STRINGS'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Philo</string>
    <string name="title_activity_main">Dictionnaire de Philosophie</string>
    <string name="package_name">com.philosophie.dictionnaire</string>
    <string name="custom_url_scheme">com.philosophie.dictionnaire</string>
</resources>
STRINGS
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
log "Personnalisations XML ✓"

# Icons
ICON_SRC="android-icons"
if [ -d "$ICON_SRC" ]; then
  for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    TARGET_DIR="$ANDROID_RES/mipmap-$density"; mkdir -p "$TARGET_DIR"
    [ -f "$ICON_SRC/$density/ic_launcher.png" ] && cp "$ICON_SRC/$density/ic_launcher.png" "$TARGET_DIR/ic_launcher.png"
    [ -f "$ICON_SRC/$density/ic_launcher_round.png" ] && cp "$ICON_SRC/$density/ic_launcher_round.png" "$TARGET_DIR/ic_launcher_round.png"
    [ -f "$ICON_SRC/$density/ic_launcher_foreground.png" ] && cp "$ICON_SRC/$density/ic_launcher_foreground.png" "$TARGET_DIR/ic_launcher_foreground.png"
  done
  # Adaptive icon XML
  ANYDPI="$ANDROID_RES/mipmap-anydpi-v26"; mkdir -p "$ANYDPI"
  [ -f "$ICON_SRC/xml/ic_launcher.xml" ] && cp "$ICON_SRC/xml/ic_launcher.xml" "$ANYDPI/ic_launcher.xml"
  [ -f "$ICON_SRC/xml/ic_launcher_round.xml" ] && cp "$ICON_SRC/xml/ic_launcher_round.xml" "$ANYDPI/ic_launcher_round.xml"
  # Launcher background color
  [ -f "$ICON_SRC/xml/ic_launcher_background.xml" ] && cp "$ICON_SRC/xml/ic_launcher_background.xml" "$ANDROID_RES/values/ic_launcher_background.xml"
  log "Icônes ✓"
fi

# Widget
WIDGET_PKG="android/app/src/main/java/com/philosophie/dictionnaire"
mkdir -p "$WIDGET_PKG" "$ANDROID_RES/layout" "$ANDROID_RES/xml" "$ANDROID_RES/drawable"

cat > "$ANDROID_RES/layout/widget_article_du_jour.xml" << 'WL'
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android" android:id="@+id/widget_root" android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="vertical" android:padding="12dp" android:background="@drawable/widget_bg">
    <TextView android:id="@+id/widget_badge" android:layout_width="wrap_content" android:layout_height="wrap_content" android:text="φ · Article du jour" android:textColor="#d4a843" android:textSize="10sp" android:fontFamily="monospace"/>
    <TextView android:id="@+id/widget_title" android:layout_width="match_parent" android:layout_height="wrap_content" android:text="Philosophie" android:textColor="#f5f0e8" android:textSize="20sp" android:textStyle="bold" android:layout_marginTop="4dp" android:fontFamily="serif"/>
    <TextView android:id="@+id/widget_excerpt" android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="1" android:text="Ouvrez l'application" android:textColor="#a09880" android:textSize="12sp" android:layout_marginTop="6dp" android:maxLines="4" android:ellipsize="end"/>
    <TextView android:id="@+id/widget_tap" android:layout_width="wrap_content" android:layout_height="wrap_content" android:text="Toucher pour lire →" android:textColor="#8b2500" android:textSize="10sp" android:fontFamily="monospace" android:layout_marginTop="4dp"/>
</LinearLayout>
WL
cat > "$ANDROID_RES/drawable/widget_bg.xml" << 'WBG'
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#1a1610"/><corners android:radius="16dp"/><stroke android:width="1dp" android:color="#2e2a24"/></shape>
WBG
cat > "$ANDROID_RES/xml/widget_info.xml" << 'WI'
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android" android:minWidth="250dp" android:minHeight="110dp" android:updatePeriodMillis="86400000" android:initialLayout="@layout/widget_article_du_jour" android:resizeMode="horizontal|vertical" android:widgetCategory="home_screen" android:previewImage="@mipmap/ic_launcher"/>
WI
cat > "$WIDGET_PKG/ArticleDuJourWidget.java" << 'WJ'
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
WJ

# Manifest modifications
MANIFEST="android/app/src/main/AndroidManifest.xml"
# Note: WRITE_EXTERNAL_STORAGE / READ_EXTERNAL_STORAGE are intentionally NOT added.
# They are obsolete on Android 11+ (scoped storage) and grant nothing useful here:
# export/share goes through the Capacitor Filesystem (app-scoped cache) and the native
# Share sheet, which need no broad storage permission.
if [ -f "$MANIFEST" ] && ! grep -q "ArticleDuJourWidget" "$MANIFEST"; then
  sed -i 's|</application>|        <receiver android:name=".ArticleDuJourWidget" android:exported="true">\n            <intent-filter>\n                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />\n            </intent-filter>\n            <meta-data android:name="android.appwidget.provider" android:resource="@xml/widget_info" />\n        </receiver>\n    </application>|' "$MANIFEST"
  log "Widget article du jour ✓"
fi

find "$ANDROID_RES" -name "*.xml" -exec grep -l "splashBackground" {} \; 2>/dev/null | while read f; do
  sed -i 's|@color/splashBackground|@color/colorPrimaryDark|g' "$f"
done
log "Personnalisations appliquées"

if ! (cd android && ./gradlew clean); then
  warn "gradlew clean a échoué — poursuite du build sans nettoyage complet"
fi

BUILD_TYPE="${1:-debug}"
if [ "$BUILD_TYPE" = "release" ]; then
  # Release signing must come from a secrets vault / CI environment, never from the repo.
  # No keystore is generated here and no password is written to disk. Provide these
  # environment variables (e.g. from CI secrets) before running a release build:
  #
  #   RELEASE_STORE_FILE      absolute path to your .jks/.keystore (kept OUTSIDE the repo)
  #   RELEASE_STORE_PASSWORD  keystore password
  #   RELEASE_KEY_ALIAS       key alias
  #   RELEASE_KEY_PASSWORD    key password
  #
  : "${RELEASE_STORE_FILE:?RELEASE_STORE_FILE manquant — chemin du keystore hors dépôt}"
  : "${RELEASE_STORE_PASSWORD:?RELEASE_STORE_PASSWORD manquant — à fournir via le coffre de secrets}"
  : "${RELEASE_KEY_ALIAS:?RELEASE_KEY_ALIAS manquant}"
  : "${RELEASE_KEY_PASSWORD:?RELEASE_KEY_PASSWORD manquant}"

  if [ ! -f "$RELEASE_STORE_FILE" ]; then
    err "Keystore introuvable: $RELEASE_STORE_FILE"
    exit 1
  fi

  # Inject the signing config robustly. The previous approach prepended a new
  # `release { ... }` to buildTypes, which on a stock Capacitor build.gradle (that
  # already contains a release block) produced TWO release blocks and an ambiguous
  # Gradle config. This awk pass instead adds signingConfigs once after `android {`
  # and inserts `signingConfig signingConfigs.release` INTO the existing release block.
  BUILD_GRADLE="android/app/build.gradle"
  if ! grep -q "signingConfigs" "$BUILD_GRADLE"; then
    awk '
      /android[[:space:]]*\{/ && !sign {
        print; sign=1
        print "    signingConfigs { release {"
        print "        storeFile file(RELEASE_STORE_FILE)"
        print "        storePassword RELEASE_STORE_PASSWORD"
        print "        keyAlias RELEASE_KEY_ALIAS"
        print "        keyPassword RELEASE_KEY_PASSWORD"
        print "    } }"
        next
      }
      /buildTypes[[:space:]]*\{/ { bt=1 }
      bt && /release[[:space:]]*\{/ && !rel {
        print; rel=1
        print "            signingConfig signingConfigs.release"
        next
      }
      { print }
    ' "$BUILD_GRADLE" > "$BUILD_GRADLE.tmp" && mv "$BUILD_GRADLE.tmp" "$BUILD_GRADLE"

    # Fallback: if no release block existed to receive the signingConfig, create one.
    if ! grep -q "signingConfig signingConfigs.release" "$BUILD_GRADLE"; then
      sed -i 's/buildTypes {/buildTypes {\n        release { signingConfig signingConfigs.release }/' "$BUILD_GRADLE"
    fi
  fi
  cd android && ./gradlew assembleRelease \
      -PRELEASE_STORE_FILE="$RELEASE_STORE_FILE" \
      -PRELEASE_STORE_PASSWORD="$RELEASE_STORE_PASSWORD" \
      -PRELEASE_KEY_ALIAS="$RELEASE_KEY_ALIAS" \
      -PRELEASE_KEY_PASSWORD="$RELEASE_KEY_PASSWORD"
  APK_PATH=$(find . -name "*release*.apk" -type f | head -1); cd ..
  [ -n "$APK_PATH" ] && cp "android/$APK_PATH" "./dictionnaire-philosophie-release.apk" && log "APK release OK" || err "APK non trouvé"
else
  cd android && ./gradlew assembleDebug; APK_PATH=$(find . -name "*debug*.apk" -type f | head -1); cd ..
  [ -n "$APK_PATH" ] && cp "android/$APK_PATH" "./dictionnaire-philosophie-debug.apk" && log "APK debug OK" || err "APK non trouvé"
fi
log "Terminé ! → adb install dictionnaire-philosophie-${BUILD_TYPE}.apk"
