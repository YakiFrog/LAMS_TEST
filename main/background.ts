import path from 'path'
import { app, ipcMain, dialog, BrowserWindow } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import fs from 'fs'

const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

;(async () => {
  await app.whenReady()

  const mainWindow = createWindow('main', {
    width: 1000,
    height: 600,
    webPreferences: {
      preload: isProd 
        ? path.join(__dirname, 'preload.js') 
        : path.join(app.getAppPath(), 'main', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (isProd) {
    await mainWindow.loadURL('app://./home')
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}/home`)
    mainWindow.webContents.openDevTools()
  }

  // 参照ボタンで使用するディレクトリ選択ダイアログのハンドラー
  ipcMain.handle('select-directory', async () => {
    console.log('select-directory handler called');
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
      });
      console.log('Directory selection result:', result);
      return result;
    } catch (error) {
      console.error('Directory selection error:', error);
      return { canceled: true, filePaths: [] };
    }
  });

  // ファイル保存のハンドラー
  ipcMain.handle('save-file', async (_, options) => {
    try {
      const { filePath, data } = options;
      const dirPath = path.dirname(filePath);
      
      // ディレクトリが存在しない場合は作成
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      fs.writeFileSync(filePath, data, 'utf8');
      return { success: true, filePath };
    } catch (error) {
      console.error('File save error:', error);
      return { success: false, error: error.toString() };
    }
  });

  // ファイルが存在するか確認するハンドラー
  ipcMain.handle('file-exists', async (_, filePath) => {
    try {
      const exists = fs.existsSync(filePath);
      return { exists };
    } catch (error) {
      return { exists: false, error: error.toString() };
    }
  });

  // ファイル読み込みのハンドラー
  ipcMain.handle('read-file', async (_, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return data;
      } else {
        throw new Error('ファイルが存在しません: ' + filePath);
      }
    } catch (error) {
      throw new Error(`ファイル読み込みエラー: ${error.toString()}`);
    }
  });
})()

app.on('window-all-closed', () => {
  app.quit()
})
