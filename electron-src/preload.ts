import { contextBridge, ipcRenderer } from 'electron';

// レンダラープロセスに公開するAPI
contextBridge.exposeInMainWorld('electron', {
  selectDirectory: async () => {
    return await ipcRenderer.invoke('select-directory');
  },
  saveFile: async (options: { filePath: string; data: string }) => {
    return await ipcRenderer.invoke('save-file', options);
  },
  fileExists: async (filePath: string) => {
    return await ipcRenderer.invoke('file-exists', filePath);
  },
  readFile: async (filePath: string) => {
    return await ipcRenderer.invoke('read-file', filePath);
  }
});
