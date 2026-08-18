import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { registerIpcHandlers } from './ipc';
import { createTransformRegistry } from './transforms/registry';
import { ProjectManager } from './projectManager';
import { deviceSettingsService } from './services/deviceSettings';
import { ollamaManager } from './services/ollama';

const isDevelopment = process.env.NODE_ENV === 'development';
const defaultRendererUrl = 'http://localhost:5173';
const screenshotOutputDir = process.env.VITNI_SCREENSHOT_DIR?.trim() || null;
const screenshotProjectPath = process.env.VITNI_SCREENSHOT_PROJECT?.trim() || null;
const screenshotMode = Boolean(screenshotOutputDir && screenshotProjectPath);
const screenshotWorkspaces = [
  'overview',
  'graph',
  'timeline',
  'entities',
  'assertions',
  'sources',
  'attention',
  'evidence',
  'reports',
  'search'
] as const;

let mainWindow: BrowserWindow | null = null;
let projectManager: ProjectManager | null = null;

function getDevelopmentRendererUrl() {
  if (process.env.VITNI_DEV_SERVER_URL) {
    return process.env.VITNI_DEV_SERVER_URL;
  }

  try {
    const configPath = path.resolve(process.cwd(), '.vitni-dev-server.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as { url?: string };

    if (typeof parsed.url === 'string' && parsed.url.length > 0) {
      return parsed.url;
    }
  } catch {
    // Fall back to the default port when no resolved dev server config exists.
  }

  return defaultRendererUrl;
}

async function waitForRendererCondition(
  window: BrowserWindow,
  expression: string,
  timeoutMs = 20_000
): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const ready = await window.webContents.executeJavaScript(`Boolean(${expression})`, true);
      if (ready) return;
    } catch {
      // The renderer may still be navigating. Retry until the deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for renderer condition: ${expression}`);
}

async function writeScreenshotDiagnostics(window: BrowserWindow, outputDir: string, label: string) {
  try {
    const image = await window.webContents.capturePage();
    await fs.promises.writeFile(path.join(outputDir, `${label}.png`), image.toPNG());
  } catch (error) {
    console.error('[Screenshots] failed to capture diagnostic image', error);
  }

  try {
    const rendererState = await window.webContents.executeJavaScript(
      `({
        url: window.location.href,
        title: document.title,
        bodyText: document.body?.innerText?.slice(0, 12000) ?? '',
        rootHtml: document.getElementById('root')?.innerHTML?.slice(0, 12000) ?? '',
        hasV2App: Boolean(document.querySelector('.v2-app')),
        hasV2Content: Boolean(document.querySelector('.v2-content')),
        hasWelcome: Boolean(document.querySelector('[class*="welcome"], [class*="Welcome"]')),
        hasSplash: Boolean(document.querySelector('[class*="splash"], [class*="Splash"]'))
      })`,
      true
    );
    await fs.promises.writeFile(
      path.join(outputDir, `${label}.json`),
      `${JSON.stringify(rendererState, null, 2)}\n`,
      'utf8'
    );
    console.log(`[Screenshots] diagnostic state: ${JSON.stringify(rendererState)}`);
  } catch (error) {
    console.error('[Screenshots] failed to capture diagnostic renderer state', error);
  }
}

async function captureVitni2Screenshots(window: BrowserWindow): Promise<void> {
  if (!screenshotOutputDir) return;

  const outputDir = path.resolve(screenshotOutputDir);
  await fs.promises.mkdir(outputDir, { recursive: true });

  try {
    await waitForRendererCondition(
      window,
      `document.querySelector('.v2-content[data-v2-workspace]') && !document.querySelector('.v2-data-loading')`,
      30_000
    );
  } catch (error) {
    await writeScreenshotDiagnostics(window, outputDir, 'diagnostic-readiness-timeout');
    throw error;
  }

  for (const workspace of screenshotWorkspaces) {
    await window.webContents.executeJavaScript(
      `window.dispatchEvent(new CustomEvent('vitni:screenshot-workspace', { detail: { workspace: ${JSON.stringify(workspace)} } }))`,
      true
    );
    try {
      await waitForRendererCondition(
        window,
        `document.querySelector('.v2-content[data-v2-workspace=${JSON.stringify(workspace)}]') && !document.querySelector('.v2-data-loading')`
      );
    } catch (error) {
      await writeScreenshotDiagnostics(window, outputDir, `diagnostic-${workspace}-timeout`);
      throw error;
    }

    // Give layout engines, fonts and transitions a brief deterministic settle window.
    await new Promise((resolve) => setTimeout(resolve, workspace === 'graph' ? 1200 : 450));
    const image = await window.webContents.capturePage();
    await fs.promises.writeFile(path.join(outputDir, `${workspace}.png`), image.toPNG());
    console.log(`[Screenshots] captured ${workspace}`);
  }

  console.log(`[Screenshots] wrote ${screenshotWorkspaces.length} screenshots to ${outputDir}`);
  app.quit();
}

async function createWindow() {
  console.log('[Main] createWindow start');

  mainWindow = new BrowserWindow({
    width: screenshotMode ? 1600 : 1440,
    height: screenshotMode ? 1000 : 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0f172a',
    show: true,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, '../../../preload/app/preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (screenshotMode) {
    mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      console.log(`[Renderer:${level}] ${message} (${sourceId}:${line})`);
    });
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
      console.error('[Screenshots] renderer process gone', details);
    });
  }

  console.log('[Main] init: creating project manager');
  const encryptionKey =
    process.env.PI_DB_KEY && process.env.PI_DB_KEY.trim().length > 0
      ? process.env.PI_DB_KEY
      : await deviceSettingsService.getOrCreateDatabaseEncryptionKey();
  projectManager = new ProjectManager(path.join(app.getPath('userData'), 'projects'), encryptionKey);
  console.log('[Main] init: building transform registry');
  const transformRegistry = createTransformRegistry();
  console.log('[Main] init: registering IPC handlers');
  registerIpcHandlers(ipcMain, projectManager, transformRegistry, ollamaManager, mainWindow);

  if (screenshotMode && screenshotProjectPath) {
    await projectManager.initialize();
    await projectManager.openProject(path.resolve(screenshotProjectPath));
  }

  if (isDevelopment) {
    const rendererUrl = new URL(getDevelopmentRendererUrl());
    if (screenshotMode) {
      rendererUrl.searchParams.set('ui', 'v2');
      rendererUrl.searchParams.set('screenshot', '1');
    }
    await mainWindow.loadURL(rendererUrl.toString());
  } else {
    const indexHtml = path.join(__dirname, '../../../renderer/index.html');
    await mainWindow.loadFile(
      indexHtml,
      screenshotMode ? { query: { ui: 'v2', screenshot: '1' } } : undefined
    );
  }

  if (screenshotMode) {
    void captureVitni2Screenshots(mainWindow).catch((error) => {
      console.error('[Screenshots] capture failed', error);
      app.exit(1);
    });
  }

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow?.isVisible()) {
      mainWindow?.show();
    }
    if (isDevelopment && !screenshotMode) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' });
    }
  });

  mainWindow.webContents.once('did-finish-load', () => {
    if (!mainWindow?.isVisible()) {
      mainWindow?.show();
    }
  });

  mainWindow.webContents.once('did-fail-load', (_event, code, desc) => {
    if (screenshotMode) {
      console.error(`[Screenshots] renderer failed to load: ${desc} (code ${code})`);
      app.exit(1);
      return;
    }
    dialog.showErrorBox('Renderer failed to load', `${desc} (code ${code})`);
    if (!mainWindow?.isVisible()) {
      mainWindow?.show();
    }
  });

  if (!screenshotMode) {
    ;(async () => {
      try {
        await projectManager?.initialize();
        console.log('[Main] init: complete');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[Main] init error:', message);
        dialog.showErrorBox('Initialization error', message);
      }
    })().catch(() => {});
  } else {
    console.log('[Main] screenshot init: complete');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    void projectManager?.closeProject();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  try {
    let keepAlive = false;
    try {
      const deviceSettingsPath = path.join(app.getPath('userData'), 'device-settings.json');
      if (fs.existsSync(deviceSettingsPath)) {
        const raw = fs.readFileSync(deviceSettingsPath, 'utf8');
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        keepAlive = Boolean(parsed['ai:ollama:keepAlive']);
      } else if (projectManager) {
        const db = projectManager.getDatabase();
        const row = db.prepare('SELECT value_json FROM project_setting WHERE key = ? LIMIT 1').get('ai:ollama:keepAlive') as { value_json: string } | undefined;
        keepAlive = row ? Boolean(JSON.parse(row.value_json)) : false;
      }
    } catch {
      keepAlive = false;
    }
    if (!keepAlive) ollamaManager.stop();
  } catch {
    // ignore
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

app.on('ready', async () => {
  try {
    await createWindow();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (screenshotMode) {
      console.error('[Screenshots] startup error:', message);
      app.exit(1);
      return;
    }
    dialog.showErrorBox('Startup error', message);
    app.quit();
  }
});
