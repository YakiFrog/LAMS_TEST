const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js') // ここでpreload.jsを指定
    }
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../out/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// ディレクトリ選択ハンドラーの追加
ipcMain.handle('select-directory', async () => {
  const mainWindow = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result;
});

// ファイル保存ハンドラーの追加
ipcMain.handle('save-file', async (event, options) => {
  try {
    const { filePath, data } = options;
    
    // ディレクトリが存在するか確認し、存在しない場合は作成
    const directory = path.dirname(filePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    
    // ファイルに書き込み
    fs.writeFileSync(filePath, data, 'utf8');
    
    return {
      success: true,
      filePath: filePath
    };
  } catch (error) {
    console.error('ファイル保存エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// ファイルの存在確認ハンドラーを追加
ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    const exists = fs.existsSync(filePath);
    return { exists };
  } catch (error) {
    console.error('ファイル存在確認エラー:', error);
    return {
      exists: false,
      error: error.message
    };
  }
});

// ファイル読み込みハンドラーを追加
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: 'ファイルが存在しません',
        data: ''
      };
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('ファイル読み込みエラー:', error);
    return {
      success: false,
      error: error.message,
      data: ''
    };
  }
});
