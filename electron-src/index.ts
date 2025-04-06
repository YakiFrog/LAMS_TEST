import { app } from 'electron';
import serve from 'electron-serve';
import { createWindow } from './helpers/create-window';  // パスを修正
import { ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const isProd: boolean = process.env.NODE_ENV === 'production';

if (isProd) {
  serve({ directory: 'app' });
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

(async () => {
  await app.whenReady();

  const mainWindow = createWindow('main', {
    width: 1000,
    height: 600,
  });

  if (isProd) {
    await mainWindow.loadURL('app://./home.html');
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    mainWindow.webContents.openDevTools();
  }
})();

app.on('window-all-closed', () => {
  app.quit();
});

// ディレクトリ選択ハンドラーの追加
ipcMain.handle('select-directory', async () => {
  try {
    const mainWindow = await createWindow('dialog', {
      width: 0,
      height: 0,
      show: false,
    });
    
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    
    mainWindow.close();
    return result;
  } catch (error) {
    console.error('ディレクトリ選択エラー:', error);
    return { canceled: true, filePaths: [] };
  }
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