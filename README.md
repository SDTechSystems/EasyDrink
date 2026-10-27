# EasyDrink

EasyDrink is a point-of-sale application for small businesses. It supports sales, products, inventory, customers, suppliers and daily reports, with business records stored locally on the device.

This repository adapts FreeKasir for Spanish-speaking businesses, with Spanish as the default language, English as an alternative and Colombian pesos as the currency. Some application names and assets still use the FreeKasir identity.

## Daily operations

- Build a cart, apply discounts, calculate change and save open bills for later payment.
- Manage products, categories, units, photos, SKUs and barcodes.
- Record stock movements and stock counts, and calculate weighted-average product costs.
- Track customer balances, business expenses and supplier information.
- Review sales, transaction history and daily closing reports, with spreadsheet exports.
- Configure receipt details and print through supported Bluetooth thermal printers.
- Enable local staff accounts with PINs and permissions.

The interface adapts to phones and tablets, supports dark and light themes, and can be installed as a progressive web app. The repository also includes an Android application built with Capacitor. Camera scanning and receipt printing depend on browser permissions and compatible hardware; Bluetooth support differs between the web and Android versions.

## Local data and backups

Sales and inventory records are stored in IndexedDB on the current device. This version does not include cloud synchronization, online billing or telemetry. Local staff accounts do not provide shared access across devices.

Export regular JSON backups from Settings and keep a copy outside the device. Clearing browser storage or losing the device can remove the local database. The web app needs an initial visit while online before its cached interface can work offline.

## Run from source

Use a current Node.js LTS release, such as Node.js 22.12 or later, and npm.

```sh
git clone https://github.com/SDTechSystems/EasyDrink.git
cd EasyDrink
npm ci
npm run dev
```

The development server uses `http://localhost:8080`.

```sh
npm test
npm run lint
npm run build
npm run preview
```

The build updates `version.json` and generates the web application in `dist/`.

## Android build

Android builds require Android Studio, the Android SDK and JDK 21. Configure `JAVA_HOME` for the local JDK, then run:

```sh
npm run cap:sync
npx cap open android
```

From the `android/` directory, use `./gradlew assembleDebug` on Linux or macOS, or `.\gradlew.bat assembleDebug` on Windows. The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. Distribution builds require release signing.

## Development and license

The application uses React, TypeScript, Vite and Dexie. Translations are in `src/i18n/locales/es/` and `src/i18n/locales/en/`; the database is defined in `src/lib/db.ts`. Monetary values use integer Colombian pesos.

EasyDrink is derived from [FreeKasir](https://github.com/jipraks/kasirgratisan) through the [KhanxLab fork](https://github.com/KhanxLab/kasirgratisan). It retains its upstream contributors and [MIT license](LICENSE). Third-party components retain their respective notices.
