// グローバル型定義ファイル

interface Window {
  electron: {
    selectDirectory: () => Promise<{ canceled: boolean; filePaths: string[] }>;
    saveFile: (options: { filePath: string; data: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    fileExists: (filePath: string) => Promise<{ exists: boolean; error?: string }>;
    readFile: (filePath: string) => Promise<string>;
  };
}
