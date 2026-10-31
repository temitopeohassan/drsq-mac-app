# DRSQ Oasis Launcher

A Windows Electron app that opens https://agent.drsqoasis.com/ in a dedicated desktop window.

## Requirements
- Windows 10/11
- Node.js LTS from https://nodejs.org/en/download
- Internet connection for dependency installation and builds

## Run locally
Open PowerShell in this folder and run:

```powershell
node --version
npm --version
npm install
npm start
```

## Build Windows installer
```powershell
npm run dist
```

The installer should appear in `dist` with a name similar to `DRSQ Oasis Setup 1.0.0.exe`.

## macOS (Apple Silicon: M1/M2/M3)

### Option A: package on Windows (already done once)
electron-builder cannot build macOS apps on Windows, so `scripts/package-mac-arm64.py`
repackages Electron's official `darwin-arm64` release zip (matching the Electron version in
`node_modules/electron`) with this app's code, name and icon. It keeps the bundle's
symlinks intact:

```powershell
python scripts/package-mac-arm64.py path\to\electron-v39.8.10-darwin-arm64.zip
```

Output: `dist/DRSQ Oasis-1.0.0-mac-arm64.zip`. Download the Electron zip from
https://github.com/electron/electron/releases (and check its SHASUMS256.txt).

**On the Mac, the first time only:** the bundle is not signed by an Apple developer, so
after unzipping it, move it to Applications and run this once in Terminal:

```bash
xattr -cr "/Applications/DRSQ Oasis.app"
codesign --force --deep --sign - "/Applications/DRSQ Oasis.app"
```

After that, open it normally. Requires macOS 12 Monterey or newer.

### Option B: build natively on a Mac
Copy the project to the Mac **without** `node_modules` and `dist`, then run:

```bash
npm install
npm run dist:mac
```

This produces an ad-hoc-signed `.dmg` and `.zip` for arm64 in `dist/`. On first launch,
right-click the app and choose **Open**, or run the `xattr -cr` command above.
For distribution without warnings, sign with an Apple Developer ID and notarize.

## Customize
Replace `build/icon.ico` with your own Windows `.ico` icon, then run `npm run dist` again.

To rename the app, update `productName` and `shortcutName` in `package.json`, and `APP_NAME` in `main.js`. If you distribute updates later, keep `appId` unchanged.

## Uploads and downloads
- Uploads use the website's normal file input and native Windows file picker.
- Downloads prompt for a save location.
- Cookies and local storage persist in Electron's default session.
- The app does not bypass website authentication, certificate errors, or server restrictions.

## Troubleshooting
- If the page fails, open the URL in Edge and check whether it loads and its HTTPS certificate is valid.
- Review PowerShell logs beginning with `[load-error]`, `[download]`, or `[navigation]`.
- Unsigned installers can trigger Microsoft Defender SmartScreen warnings. Code signing can help establish publisher identity.
