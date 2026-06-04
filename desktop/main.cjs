const { app, BrowserWindow, Menu } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const projectRoot = path.resolve(__dirname, "..");
const host = process.env.BLISS_APP_HOST || process.env.WOVOPS_APP_HOST || "127.0.0.1";
const port = Number(process.env.BLISS_APP_PORT || process.env.WOVOPS_APP_PORT || "3002");
const appUrl = process.env.BLISS_APP_URL || process.env.WOVOPS_APP_URL || `http://${host}:${port}`;
const shouldStartServer = String(process.env.BLISS_DESKTOP_START_SERVER || process.env.WOVOPS_DESKTOP_START_SERVER || "true").toLowerCase() !== "false";
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const nextOutput = path.join(projectRoot, ".next");

let serverProcess = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithTimeout(url, timeoutMs = 1200) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "text/html" },
      signal: controller.signal,
      redirect: "manual"
    });
    return response.ok || response.status >= 200 && response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function waitForAppReady(url, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await fetchWithTimeout(url);
    if (ok) return true;
    await sleep(500);
  }
  return false;
}

function startNextServer() {
  if (!shouldStartServer) {
    return null;
  }

  if (!fs.existsSync(nextOutput)) {
    throw new Error("No .next output found. Run npm run build before launching the desktop wrapper.");
  }

  if (!fs.existsSync(nextBin)) {
    throw new Error(`Next binary not found at ${nextBin}. Run npm install and npm run build.`);
  }

  const child = spawn(process.execPath, [nextBin, "start", "--hostname", host, "--port", String(port)], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: "production"
    },
    stdio: "pipe"
  });

  child.stdout.on("data", (data) => {
    process.stdout.write(`[next] ${data}`);
  });

  child.stderr.on("data", (data) => {
    process.stderr.write(`[next] ${data}`);
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      console.error(`Next server exited with code ${code}`);
    }
  });

  return child;
}

function createWindow() {
  const icon = path.join(projectRoot, "public", "icons", "bliss-planner-icon-512.png");

  const mainWindow = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    icon: fs.existsSync(icon) ? icon : undefined,
    title: "Bliss Planner",
    backgroundColor: "#080c0b",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadURL(appUrl).catch((error) => {
    console.error("Failed to load app URL:", error);
  });
}

async function bootstrap() {
  Menu.setApplicationMenu(null);

  try {
    serverProcess = startNextServer();
  } catch (error) {
    console.error(error.message);
    throw error;
  }

  if (serverProcess) {
    const ready = await waitForAppReady(appUrl);
    if (!ready) {
      console.error(`App failed to start on ${appUrl}. Aborting.`);
      if (!serverProcess.killed) {
        serverProcess.kill("SIGTERM");
      }
      app.quit();
      return;
    }
  }

  createWindow();
}

app.whenReady().then(() => {
  bootstrap().catch((error) => {
    console.error("Desktop startup error:", error);
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("quit", () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGTERM");
  }
});
