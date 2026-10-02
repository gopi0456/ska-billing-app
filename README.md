# 🏥 SK Ayurveda Billing App

**SK AAYURVEDA - KEVA SUPER STOCK POINT**

A professional billing and customer management Android application built with Capacitor, optimized for **Termux + PRoot-Distro** build environment.

---

## 📱 Installation & Environment Setup

### Step 1: Install Packages in Termux (Native)

Open Termux (NOT inside PRoot) and run:

```bash
pkg update -y && pkg upgrade -y
pkg install tur-repo -y
pkg install nodejs-lts openjdk-21 android-tools git -y
termux-setup-storage
```

**What this installs:**

| Package | Purpose |
|---------|---------|
| `nodejs-lts` | Node.js runtime for Capacitor & npm |
| `openjdk-21` | Java 21 JDK (required by Capacitor 8) |
| `android-tools` | ADB, AAPT2, and other Android build tools |
| `git` | Version control for GitHub push |
| `tur-repo` | Termux User Repository for extra packages |

### Step 2: Verify Installations (in Termux)

```bash
node -v
java -version
aapt2 version
adb version
git --version
```

### Step 3: Enter PRoot Environment

```bash
proot-distro login ubuntu
```

### Step 4: Set Environment Variables in PRoot

Add these to `~/.bashrc` inside PRoot so Termux tools are accessible:

```bash
cat >> ~/.bashrc << 'ENVEOF'

# === Termux Tools Access from PRoot ===
export TERMUX_PREFIX=/data/data/com.termux/files/usr
export JAVA_HOME=$TERMUX_PREFIX/lib/jvm/java-21-openjdk
export ANDROID_HOME=$TERMUX_PREFIX/opt/android-sdk
export PATH=$JAVA_HOME/bin:$TERMUX_PREFIX/bin:$PATH
export LD_LIBRARY_PATH=$TERMUX_PREFIX/lib:$LD_LIBRARY_PATH
ENVEOF

source ~/.bashrc
```

### Step 5: Verify Tools Work Inside PRoot

```bash
java -version
node -v
aapt2 version
adb version
```

### Step 6: Initialize Project

```bash
cd ~/ska-billing-app
npm install
npx cap init "SK Aayurveda" "com.skaayurveda.app" --web-dir src
npx cap add android
npx cap sync android
```

### Step 7: Configure Gradle for PRoot

```bash
cd ~/ska-billing-app/android

# Set gradle.properties
cat > gradle.properties << 'GRADLEEOF'
org.gradle.java.home=/data/data/com.termux/files/usr/lib/jvm/java-21-openjdk
org.gradle.java.installations.auto-detect=false
org.gradle.java.installations.auto-download=false
org.gradle.workers.max=1
org.gradle.daemon=false
android.aapt2FromMavenOverride=/data/data/com.termux/files/usr/bin/aapt2
android.useAndroidX=true
GRADLEEOF

# Set local.properties
echo "sdk.dir=/data/data/com.termux/files/usr/opt/android-sdk" > local.properties
```

---

## 🔨 Build APK

```bash
cd ~/ska-billing-app
npx cap sync android
cd android
./gradlew clean assembleDebug --no-daemon --no-parallel
```

### Copy APK to Phone Storage

```bash
cp app/build/outputs/apk/debug/app-debug.apk /data/data/com.termux/files/home/storage/shared/Download/SK_Ayurveda.apk
```

> ⚠️ **Note:** Uninstall any previous version of the app on your phone before installing the new APK to avoid signature conflicts.

---

## 🚀 Push to GitHub

### First Time Setup

```bash
cd ~/ska-billing-app
git init
git add .
git commit -m "v1.8 - SK Ayurveda Billing App"
git branch -M main
git remote add origin https://github.com/gopi0456/ska-billing-app.git
```

### Push Using Personal Access Token

1. Go to: https://github.com/settings/tokens → **Tokens (classic)** → Generate new token
2. Select scope: ✅ `repo`
3. Copy the `ghp_...` token
4. Run:

```bash
git remote set-url origin https://YOUR_GHP_TOKEN@github.com/gopi0456/ska-billing-app.git
git push -u origin main
git tag -a v1.8 -m "Version 1.8"
git push origin v1.8
```

---

## 🆘 Troubleshooting

| Issue | Fix |
|-------|-----|
| `AAPT2 Daemon startup failed` | Ensure `org.gradle.workers.max=1` and `android.aapt2FromMavenOverride` points to Termux aapt2 |
| `SDK location not found` | Check `sdk.dir` in `android/local.properties` |
| `App not installed` on phone | Uninstall old version first |
| `Authentication failed` (Git) | Use Classic PAT with `repo` scope, embed in URL |
| `java: command not found` in PRoot | Run `source ~/.bashrc` or check `JAVA_HOME` path |

---

**Made with ❤️ for SK Ayurveda Wellness Centre**
*KEVA SUPER STOCK POINT*
