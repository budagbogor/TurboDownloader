import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'dist', 'favicon.ico')
  });

  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function startServer() {
  const serverPath = path.join(__dirname, 'dist-server', 'server.js');
  serverProcess = spawn(process.execPath, [serverPath], {
    env: { ...process.env, NODE_ENV: 'production' }
  });

  serverProcess.stdout.on('data', (data) => console.log(`Server: ${data}`));
  serverProcess.stderr.on('data', (data) => console.error(`Server Error: ${data}`));

  setTimeout(createWindow, 2000);
}

app.on('ready', startServer);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
