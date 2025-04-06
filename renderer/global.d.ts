// グローバル型定義ファイル

// Electron API型定義
interface Window {
  electron: {
    selectDirectory: () => Promise<{ canceled: boolean; filePaths: string[] }>;
    saveFile: (options: { filePath: string; data: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    fileExists: (filePath: string) => Promise<{ exists: boolean; error?: string }>;
    readFile: (filePath: string) => Promise<string>;
    isElectron: boolean;
  };
  
  // IPC ハンドラーの型定義
  ipc: {
    send: (channel: string, value: unknown) => void;
    on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
  };
  
  // デバッグ用関数
  logInitError: (error: Error) => void;
}

// Node.js の process オブジェクトの型拡張
declare namespace NodeJS {
  interface Process {
    env: {
      NODE_ENV: 'development' | 'production' | 'test';
      [key: string]: string | undefined;
    };
  }
}
