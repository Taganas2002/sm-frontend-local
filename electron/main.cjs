/* electron/main.cjs */
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { spawn, spawnSync } = require("node:child_process");
const http = require("node:http");

let mainWindow = null;
let backendProc = null;
const isDev = !app.isPackaged;

// ===== App / Logging =====
const APP_NAME = "SchoolManagement";
app.setName(APP_NAME);
app.setAppLogsPath();
const LOG_DIR = app.getPath("logs");
fs.mkdirSync(LOG_DIR, { recursive: true });

const LOG_FILE = path.join(LOG_DIR, "main.log");
function log(...parts) {
  try {
    fs.appendFileSync(
      LOG_FILE,
      `[${new Date().toISOString()}] ${parts.join(" ")}\n`
    );
  } catch {}
}
log("=== Start === version:", app.getVersion(), "isDev:", isDev);

// ===== Resource paths =====
const RES_DIR = isDev
  ? path.join(process.cwd(), "electron-resources")
  : path.join(process.resourcesPath, "electron-resources");

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

const JAR_PATH = path.join(RES_DIR, "backend.jar");
const JRE_BIN = path.join(RES_DIR, "jre", "bin");
const JDK_BIN = path.join(RES_DIR, "jdk", "bin");

// ✅ Backend now always at root (no extra /api)
const API_BASE = "http://127.0.0.1:18080";
ipcMain.on("get-api-base-sync", (e) => {
  e.returnValue = exists(JAR_PATH) ? API_BASE : null;
});

// ===== Data / DB =====
function dataDir() {
  const portable = process.env.PORTABLE_EXECUTABLE_DIR;
  return portable
    ? path.join(portable, "school-data")
    : path.join(app.getPath("userData"), "data");
}
function ensureDir(p) {
  if (!exists(p)) fs.mkdirSync(p, { recursive: true });
}

function ensureDatabase() {
  const d = dataDir();
  ensureDir(d);
  const db = path.join(d, "school.sqlite");
  const tpl = path.join(RES_DIR, "db-template.sqlite");
  if (!exists(db) && exists(tpl)) {
    fs.copyFileSync(tpl, db);
    log("DB created from template:", db);
  }
  return db;
}

// ===== Helpers =====
function fatal(message) {
  log("FATAL:", message);
  try {
    dialog.showErrorBox(APP_NAME, String(message));
  } catch {}
}

function getBundledJava() {
  const exe = process.platform === "win32" ? "java.exe" : "java";
  const cand = [path.join(JRE_BIN, exe), path.join(JDK_BIN, exe)];
  const found = cand.find(exists);
  if (!found)
    throw new Error(
      "Bundled Java not found:\n" + cand.join("\n")
    );
  const v = spawnSync(found, ["-version"], { encoding: "utf8" });
  const ver = (v.stderr || v.stdout || "").replace(/\s+/g, " ").trim();
  log(`Using Java: ${found} | -version: ${ver}`);
  return found;
}

function waitForBackendHealth(
  url = `${API_BASE}/actuator/health`,
  timeoutMs = 30000,
  intervalMs = 500
) {
  const started = Date.now();
  log("Waiting for backend health:", url);
  return new Promise((resolve, reject) => {
    function tick() {
      const req = http.get(url, { timeout: 2000 }, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let ok = false;
          try {
            ok = res.statusCode === 200 && JSON.parse(data).status === "UP";
          } catch {}
          if (ok) return resolve();
          if (Date.now() - started > timeoutMs)
            return reject(new Error("Timeout waiting for health"));
          setTimeout(tick, intervalMs);
        });
      });
      req.on("error", () => {
        if (Date.now() - started > timeoutMs)
          return reject(new Error("Timeout waiting for health"));
        setTimeout(tick, intervalMs);
      });
      req.end();
    }
    tick();
  });
}

// ===== Backend =====
function startEmbeddedBackend() {
  if (!exists(JAR_PATH)) {
    fatal(`backend.jar not found at ${JAR_PATH}`);
    return;
  }

  let javaBin;
  try {
    javaBin = getBundledJava();
  } catch (e) {
    fatal(e.message);
    return;
  }

  const dbPath = ensureDatabase();
  const args = [
    "-Dfile.encoding=UTF-8",
    "-Duser.timezone=Africa/Algiers",
    "-jar",
    JAR_PATH,
    "--server.address=127.0.0.1",
    "--server.port=18080",
    // ❌ removed context-path
    "--spring.profiles.active=desktop",
    `--spring.datasource.url=jdbc:sqlite:${dbPath.replace(/\\/g, "/")}`,
  ];

  log('Starting backend:', `"${javaBin}"`, args.join(" "));
  backendProc = spawn(javaBin, args, {
    cwd: RES_DIR,
    env: { ...process.env },
    windowsHide: true,
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const out = fs.createWriteStream(path.join(LOG_DIR, "backend.out.log"), {
    flags: "a",
  });
  const err = fs.createWriteStream(path.join(LOG_DIR, "backend.err.log"), {
    flags: "a",
  });
  backendProc.stdout.on("data", (d) => out.write(d));
  backendProc.stderr.on("data", (d) => err.write(d));
  backendProc.on("exit", (code, sig) =>
    log("Backend exit:", code, sig)
  );
  backendProc.on("error", (e) =>
    log("Backend spawn error:", e.message)
  );
}

// ===== Window =====
function resolveIndexHtml() {
  const appRoot = app.getAppPath();
  return path.join(appRoot, "dist", "index.html");
}

async function createWindow() {
  if (!isDev) {
    try {
      startEmbeddedBackend();
    } catch (e) {
      log("startEmbeddedBackend failed:", e?.stack || e);
    }
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  try {
    if (isDev) {
      await mainWindow.loadURL("http://localhost:5173");
      mainWindow.webContents.openDevTools({ mode: "detach" });
    } else {
      try {
        await waitForBackendHealth();
      } catch (e) {
        log("Health check failed:", e.message);
      }
      const indexHtml = resolveIndexHtml();
      log("Loading HTML:", indexHtml);
      await mainWindow.loadFile(indexHtml);
      mainWindow.webContents.openDevTools({ mode: "detach" }); // 🔥 always open DevTools
    }
  } catch (e) {
    log("loadFile error:", e?.stack || e);
  }

  mainWindow.on("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => (mainWindow = null));
}

// ===== Single instance =====
const got = app.requestSingleInstanceLock();
if (!got) {
  app.quit();
} else {
  app.whenReady().then(createWindow);

  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on("before-quit", () => {
    try {
      if (backendProc?.pid) process.kill(backendProc.pid);
    } catch {}
  });
}
