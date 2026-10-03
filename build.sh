#!/bin/bash
set -e # Exit immediately if any command fails

echo "🚀 =========================================="
echo "   SK Ayurveda - Automated Build Script"
echo "=========================================="

# 1. Go to project directory
cd ~/ska-billing-app || { echo "❌ Project directory not found!"; exit 1; }

# 2. Sync Capacitor
echo "🔄 Step 1: Syncing Capacitor..."
npx cap sync android

# 3. Build APK
echo "🔨 Step 2: Building Android APK (this may take 1-2 minutes)..."
cd android
./gradlew assembleDebug --no-daemon

# 4. Copy to reusable locations
echo "💾 Step 3: Copying APK to reusable locations..."
APK_SOURCE="app/build/outputs/apk/debug/app-debug.apk"

if [ -f "$APK_SOURCE" ]; then
    # Copy to project root (always keeps the latest)
    cp "$APK_SOURCE" ../SK_Ayurveda_Latest.apk
    echo "✅ Saved to: ~/ska-billing-app/SK_Ayurveda_Latest.apk"
    
    # Copy to phone's Downloads folder (for easy installation/sharing)
    if [ -d "~/storage/downloads" ]; then
        cp "$APK_SOURCE" ~/storage/downloads/SK_Ayurveda_Latest.apk
        echo "✅ Saved to: ~/storage/downloads/SK_Ayurveda_Latest.apk"
    elif [ -d "/data/data/com.termux/files/home/storage/downloads" ]; then
        cp "$APK_SOURCE" /data/data/com.termux/files/home/storage/downloads/SK_Ayurveda_Latest.apk
        echo "✅ Saved to: /data/data/com.termux/files/home/storage/downloads/SK_Ayurveda_Latest.apk"
    else
        echo "⚠️ Could not find phone storage. Run 'termux-setup-storage' if needed."
    fi
    
    echo "🎉 =========================================="
    echo "   BUILD SUCCESSFUL! 🎉"
    echo "   Install 'SK_Ayurveda_Latest.apk' from your"
    echo "   phone's Downloads folder."
    echo "========================================== "
else
    echo "❌ Build failed! APK not found."
    exit 1
fi
