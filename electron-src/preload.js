const { contextBridge, ipcRenderer } = require('electron');

// レンダラープロセスで使用可能な安全なAPIをエクスポート
contextBridge.exposeInMainWorld('electron', {
  // ディレクトリ選択ダイアログを表示する関数
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  
  // ファイル保存関数
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  
  // ファイルの存在確認関数
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  
  // ファイル読み込み関数
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath)
});
