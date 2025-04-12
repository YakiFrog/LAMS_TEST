import { disableTextSelection } from './timeManager';

/**
 * アプリケーションのデフォルト設定を初期化するユーティリティ
 */

// デフォルト設定の初期化
export const setupDefaultSettings = () => {
  // 自動リサイズが有効かどうかの設定
  if (localStorage.getItem('autoResizeEnabled') === null) {
    localStorage.setItem('autoResizeEnabled', 'true');
  }
  
  // 出退勤変更時に自動リサイズを行うかどうかの設定
  if (localStorage.getItem('autoResizeOnAttendanceChange') === null) {
    localStorage.setItem('autoResizeOnAttendanceChange', 'true');
  }
};

// アプリケーション起動時の初期化処理
export function setupApplicationDefaults() {
  // テキスト選択を無効化
  disableTextSelection();
  
  // その他の初期化処理があればここに追加
  
  console.log('Application defaults initialized');
}

// Next.jsのクライアントサイドでの自動実行
if (typeof window !== 'undefined') {
  // DOMContentLoaded後に実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupApplicationDefaults);
  } else {
    // すでにDOMが読み込み済みの場合は直ちに実行
    setupApplicationDefaults();
  }
}

export default setupDefaultSettings;
