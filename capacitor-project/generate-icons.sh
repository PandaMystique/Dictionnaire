#!/bin/bash
# Génère les icônes Android à partir de icon.svg
# Nécessite : ImageMagick (convert) ou Inkscape
#
# Usage : chmod +x generate-icons.sh && ./generate-icons.sh

set -e

ICON_SVG="resources/icon.svg"
ANDROID_RES="android/app/src/main/res"

if [ ! -f "$ICON_SVG" ]; then
  echo "Fichier $ICON_SVG introuvable"
  exit 1
fi

# Densités Android : mdpi=48, hdpi=72, xhdpi=96, xxhdpi=144, xxxhdpi=192
# Pour les launchers : mdpi=48, hdpi=72, xhdpi=96, xxhdpi=144, xxxhdpi=192
# Adaptive icons foreground: +108dp de chaque côté

declare -A SIZES
SIZES[mdpi]=48
SIZES[hdpi]=72
SIZES[xhdpi]=96
SIZES[xxhdpi]=144
SIZES[xxxhdpi]=192

declare -A ADAPTIVE_SIZES
ADAPTIVE_SIZES[mdpi]=108
ADAPTIVE_SIZES[hdpi]=162
ADAPTIVE_SIZES[xhdpi]=216
ADAPTIVE_SIZES[xxhdpi]=324
ADAPTIVE_SIZES[xxxhdpi]=432

if command -v magick >/dev/null 2>&1; then
  CONVERTER="magick"
elif command -v convert >/dev/null 2>&1; then
  CONVERTER="convert"
elif command -v inkscape >/dev/null 2>&1; then
  CONVERTER="inkscape"
else
  echo "Installez ImageMagick ou Inkscape pour générer les icônes"
  echo "  macOS  : brew install imagemagick"
  echo "  Ubuntu : sudo apt install imagemagick"
  exit 1
fi

echo "Utilisation de : $CONVERTER"

for DENSITY in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  SIZE=${SIZES[$DENSITY]}
  ASIZE=${ADAPTIVE_SIZES[$DENSITY]}
  DIR="$ANDROID_RES/mipmap-$DENSITY"
  mkdir -p "$DIR"

  if [ "$CONVERTER" = "inkscape" ]; then
    inkscape "$ICON_SVG" -w "$SIZE" -h "$SIZE" -o "$DIR/ic_launcher.png" 2>/dev/null
    inkscape "$ICON_SVG" -w "$SIZE" -h "$SIZE" -o "$DIR/ic_launcher_round.png" 2>/dev/null
    inkscape "$ICON_SVG" -w "$ASIZE" -h "$ASIZE" -o "$DIR/ic_launcher_foreground.png" 2>/dev/null
  else
    $CONVERTER "$ICON_SVG" -resize "${SIZE}x${SIZE}" "$DIR/ic_launcher.png"
    $CONVERTER "$ICON_SVG" -resize "${SIZE}x${SIZE}" "$DIR/ic_launcher_round.png"
    $CONVERTER "$ICON_SVG" -resize "${ASIZE}x${ASIZE}" "$DIR/ic_launcher_foreground.png"
  fi

  echo "  [✓] mipmap-$DENSITY : ${SIZE}px / foreground ${ASIZE}px"
done

# Adaptive icon XML
ANYDPI_DIR="$ANDROID_RES/mipmap-anydpi-v26"
mkdir -p "$ANYDPI_DIR"

cat > "$ANYDPI_DIR/ic_launcher.xml" << 'XML'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/colorPrimaryDark"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
XML

cat > "$ANYDPI_DIR/ic_launcher_round.xml" << 'XML'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/colorPrimaryDark"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
XML

echo ""
echo "[✓] Icônes générées dans $ANDROID_RES/mipmap-*/"
echo "[✓] Adaptive icons dans $ANYDPI_DIR/"
