// グローバル型定義ファイル

// Node.jsのグローバル変数
declare var __dirname: string;
declare var __filename: string;

// Electron APIの型定義
interface Window {
  electron?: {
    selectDirectory: () => Promise<{ canceled: boolean; filePaths: string[] }>;
    saveFile: (options: { filePath: string; data: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    fileExists: (filePath: string) => Promise<{ exists: boolean; error?: string }>;
    readFile: (filePath: string) => Promise<string>;
    isElectron: boolean;
  };
  
  // IPC ハンドラーの型定義
  ipc?: {
    send: (channel: string, value: unknown) => void;
    on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
  };
  
  // デバッグ用関数
  logInitError?: (error: Error) => void;
  
  // Next.js開発モード用の変数
  __NEXT_DATA__?: any;
  
  // 曜日ごとの日付情報
  weekdayDatesInfo?: Record<number, string[]>;
  
  // グローバルステートを明示的に定義
  global?: typeof globalThis;
  
  // Node.js グローバル変数をWindow型にも定義
  __dirname?: string;
  __filename?: string;
}

// Node.js のプロセスオブジェクトの型拡張
declare namespace NodeJS {
  interface Process {
    env: {
      NODE_ENV: 'development' | 'production' | 'test';
      [key: string]: string | undefined;
    };
    browser?: boolean;
    cwd?: () => string;
  }
}

// グローバルなpromiseエラーハンドリングフック
interface PromiseRejectionEvent extends Event {
  promise: Promise<any>;
  reason: any;
}
