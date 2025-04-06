import {
  screen,
  BrowserWindow,
  BrowserWindowConstructorOptions,
} from 'electron';
import * as path from 'path';

export default (windowName: string, options: BrowserWindowConstructorOptions): BrowserWindow => {
  const key = 'window-state';
  const name = `window-state-${windowName}`;

  const win = new BrowserWindow({
    ...options,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.js'),
      ...options.webPreferences,
    },
  });

  return win;
};

// エクスポート名を変更して互換性を保つ
export const createWindow = (windowName: string, options: BrowserWindowConstructorOptions): BrowserWindow => {
  return exports.default(windowName, options);
};
