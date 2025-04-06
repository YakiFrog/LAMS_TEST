import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

// Electron APIをレンダラープロセスで使用できるようにする
contextBridge.exposeInMainWorld('electron', {
  // ディレクトリ選択ダイアログを開く
  selectDirectory: async () => {
    console.log('Renderer: Calling selectDirectory');
    return await ipcRenderer.invoke('select-directory');
  },
  
  // ファイルを保存する
  saveFile: async (options: { filePath: string; data: string }) => {
    return await ipcRenderer.invoke('save-file', options);
  },
  
  // ファイルが存在するか確認する
  fileExists: async (filePath: string) => {
    return await ipcRenderer.invoke('file-exists', filePath);
  },
  
  // ファイルを読み込む
  readFile: async (filePath: string) => {
    return await ipcRenderer.invoke('read-file', filePath);
  },
  
  // Electron が利用可能かどうかを確認するためのフラグ
  isElectron: true
});

// 元のIPCハンドラは残しておく
const handler = {
  send(channel: string, value: unknown) {
    ipcRenderer.send(channel, value)
  },
  on(channel: string, callback: (...args: unknown[]) => void) {
    const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
      callback(...args)
    ipcRenderer.on(channel, subscription)

    return () => {
      ipcRenderer.removeListener(channel, subscription)
    }
  },
}

contextBridge.exposeInMainWorld('ipc', handler)

export type IpcHandler = typeof handler

console.log('Preload script executed successfully');
