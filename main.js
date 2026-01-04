const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;

// 窗口状态配置文件路径
const configPath = path.join(app.getPath('userData'), 'window-state.json');

function createWindow() {
  let windowState = { width: 1200, height: 900 };

  // 读取上次保存的窗口位置和大小
  try {
    if (fs.existsSync(configPath)) {
      windowState = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) { console.error("读取窗口配置失败", e); }

  const win = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    title: "WebXn - 极速流",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });

  // 窗口关闭前保存当前位置和大小
  win.on('close', () => {
    try {
      const bounds = win.getBounds();
      fs.writeFileSync(configPath, JSON.stringify(bounds));
    } catch (e) { console.error("保存窗口配置失败", e); }
  });

  win.setMenuBarVisibility(false);
  // 强制清除缓存，防止旧代码残留
  win.webContents.session.clearCache().then(() => {
    win.loadFile('index.html');
  });
}

app.whenReady().then(createWindow);

// IPC 处理器逻辑
ipcMain.handle('dialog:openDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return canceled ? null : filePaths[0];
});

ipcMain.handle('file:copyImage', async (event, filePath) => {
  try {
    const image = nativeImage.createFromPath(filePath);
    if (image.isEmpty()) return { success: false };
    clipboard.writeImage(image);
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle('file:save', async (event, { filePath, buffer }) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) await fsPromises.mkdir(dir, { recursive: true });
    await fsPromises.writeFile(filePath, Buffer.from(buffer));
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle('file:delete', async (event, filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) throw new Error("安全限制");
    await fsPromises.unlink(filePath);
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });