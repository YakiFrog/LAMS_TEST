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

export default setupDefaultSettings;
