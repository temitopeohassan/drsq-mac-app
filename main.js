const { app, BrowserWindow, session, shell, dialog } = require("electron");
const path = require("node:path");

const APP_NAME = "DRSQ Oasis";
const START_URL = "https://agent.drsqoasis.com/";
const APP_ID = "com.drsqoasis.launcher";

let mainWindow;

app.setName(APP_NAME);
if (process.platform === "win32") {
  app.setAppUserModelId(APP_ID);
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isTrustedAppUrl(value) {
  try {
    const parsed = new URL(value);
    // Allow this site and its same-host paths in the app window.
    return parsed.protocol === "https:" && parsed.hostname === "agent.drsqoasis.com";
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: APP_NAME,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "build", "icon.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Only open standard web URLs externally; reject file:, javascript:, etc.
    if (isHttpUrl(url)) {
      shell.openExternal(url).catch((error) => {
        console.error("[external-link] Failed to open:", error);
      });
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    // Keep the main app focused on DRSQ Oasis. Links to other HTTPS/HTTP
    // sites open in the default browser instead of replacing the app page.
    if (!isTrustedAppUrl(url)) {
      event.preventDefault();
      if (isHttpUrl(url)) {
        shell.openExternal(url).catch((error) => {
          console.error("[navigation] Failed to open external URL:", error);
        });
      } else {
        console.warn("[navigation] Blocked non-web URL:", url);
      }
    }
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame) {
      console.error("[load-error]", { errorCode, errorDescription, url: validatedURL });
    }
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error("[renderer-gone]", details);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.loadURL(START_URL).catch((error) => {
    console.error("[startup] Could not load DRSQ Oasis:", error);
    dialog.showMessageBox({
      type: "error",
      title: `${APP_NAME} - Connection error`,
      message: "DRSQ Oasis could not be loaded.",
      detail: `Check your internet connection and confirm the website works in your browser.\n\n${error.message}`
    });
  });
}

app.whenReady().then(() => {
  const appSession = session.defaultSession;

  appSession.on("will-download", (_event, item) => {
    const suggestedName = item.getFilename();
    const savePath = dialog.showSaveDialogSync(mainWindow, {
      title: "Save downloaded file",
      defaultPath: path.join(app.getPath("downloads"), suggestedName),
      buttonLabel: "Save"
    });

    if (!savePath) {
      item.cancel();
      console.log("[download] Cancelled:", suggestedName);
      return;
    }

    item.setSavePath(savePath);
    console.log("[download] Started:", suggestedName, "->", savePath);

    item.on("updated", (_event, state) => {
      if (state === "interrupted") {
        console.error("[download] Interrupted:", suggestedName);
      } else if (state === "progressing") {
        const total = item.getTotalBytes();
        const percent = total ? Math.round(item.getReceivedBytes() / total * 100) : 0;
        console.log(`[download] ${suggestedName}: ${percent}%`);
      }
    });

    item.once("done", (_event, state) => {
      if (state === "completed") console.log("[download] Completed:", savePath);
      else console.error("[download] Finished with state:", state, suggestedName);
    });
  });

  // Do not grant camera/microphone or arbitrary permissions to remote content.
  appSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = new Set(["notifications", "clipboard-read", "clipboard-sanitized-write"]);
    callback(allowed.has(permission));
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
