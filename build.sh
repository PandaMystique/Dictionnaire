#!/bin/bash
set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

command -v node >/dev/null 2>&1 || err "Node.js requis"
command -v npx  >/dev/null 2>&1 || err "npx non trouvé"

if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
  [ -d "$HOME/Android/Sdk" ] && export ANDROID_HOME="$HOME/Android/Sdk"
  [ -d "$HOME/Library/Android/sdk" ] && export ANDROID_HOME="$HOME/Library/Android/sdk"
fi
log "Environnement vérifié"

[ ! -d "node_modules" ] && npm install
log "Dépendances OK"

if [ -d "android" ] && grep -rq "splashBackground" android/app/src/main/res/ 2>/dev/null; then
  warn "Ancien projet détecté, suppression..."; rm -rf android
fi

[ ! -d "android" ] && npx cap add android
log "Plateforme Android présente"

npx cap sync android
log "Sync OK"

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
if [ -f "$MANIFEST" ] && ! grep -q "WRITE_EXTERNAL_STORAGE" "$MANIFEST"; then
  sed -i 's|<application|<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />\n    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />\n    <application|' "$MANIFEST"
  log "Permissions stockage ✓"
fi
if [ -f "$MANIFEST" ] && ! grep -q "ArticleDuJourWidget" "$MANIFEST"; then
  sed -i 's|</application>|        <receiver android:name=".ArticleDuJourWidget" android:exported="true">\n            <intent-filter>\n                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />\n            </intent-filter>\n            <meta-data android:name="android.appwidget.provider" android:resource="@xml/widget_info" />\n        </receiver>\n    </application>|' "$MANIFEST"
  log "Widget article du jour ✓"
fi

find "$ANDROID_RES" -name "*.xml" -exec grep -l "splashBackground" {} \; 2>/dev/null | while read f; do
  sed -i 's|@color/splashBackground|@color/colorPrimaryDark|g' "$f"
done
log "Personnalisations appliquées"

cd android && ./gradlew clean 2>/dev/null && cd ..

BUILD_TYPE="${1:-debug}"
if [ "$BUILD_TYPE" = "release" ]; then
  KEYSTORE="keystore.jks"; ALIAS="philosophie"
  if [ ! -f "$KEYSTORE" ]; then
    keytool -genkeypair -v -keystore "$KEYSTORE" -alias "$ALIAS" -keyalg RSA -keysize 2048 -validity 10000 -storepass philosophie2024 -keypass philosophie2024 -dname "CN=Dictionnaire de Philosophie, OU=Dev, O=Philo, L=Paris, ST=IDF, C=FR"
  fi
  GRADLE_PROPS="android/gradle.properties"; sed -i '/^RELEASE_/d' "$GRADLE_PROPS" 2>/dev/null || true
  cat >> "$GRADLE_PROPS" << GRADLE
RELEASE_STORE_FILE=../../${KEYSTORE}
RELEASE_STORE_PASSWORD=philosophie2024
RELEASE_KEY_ALIAS=${ALIAS}
RELEASE_KEY_PASSWORD=philosophie2024
GRADLE
  BUILD_GRADLE="android/app/build.gradle"
  if ! grep -q "signingConfigs" "$BUILD_GRADLE"; then
    sed -i '/android {/a\    signingConfigs { release { storeFile file(RELEASE_STORE_FILE)\n storePassword RELEASE_STORE_PASSWORD\n keyAlias RELEASE_KEY_ALIAS\n keyPassword RELEASE_KEY_PASSWORD } }' "$BUILD_GRADLE"
    sed -i 's/buildTypes {/buildTypes { release { signingConfig signingConfigs.release }/' "$BUILD_GRADLE"
  fi
  cd android && ./gradlew assembleRelease; APK_PATH=$(find . -name "*release*.apk" -type f | head -1); cd ..
  [ -n "$APK_PATH" ] && cp "android/$APK_PATH" "./dictionnaire-philosophie-release.apk" && log "APK release OK" || err "APK non trouvé"
else
  cd android && ./gradlew assembleDebug; APK_PATH=$(find . -name "*debug*.apk" -type f | head -1); cd ..
  [ -n "$APK_PATH" ] && cp "android/$APK_PATH" "./dictionnaire-philosophie-debug.apk" && log "APK debug OK" || err "APK non trouvé"
fi
log "Terminé ! → adb install dictionnaire-philosophie-${BUILD_TYPE}.apk"
