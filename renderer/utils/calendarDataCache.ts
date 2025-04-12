/**
 * カレンダーデータのキャッシュを管理するユーティリティ
 */

// カレンダーデータ型
export interface CalendarDataType {
  date: string; // YYYY-MM-DD形式
  stayTimeSeconds: number;
  level: number; // 0-4の強度レベル
}

// キャッシュのデータ構造
interface CalendarCache {
  [key: string]: { // key: studentId-year-month
    timestamp: number; // 最終更新時刻
    data: Map<string, CalendarDataType>; // 日付をキーとしたデータマップ
    maxStayTime: number; // その月の最大滞在時間
  };
}

// メモリ内キャッシュ
const cache: CalendarCache = {};

// キャッシュキーを生成する
export const generateCacheKey = (studentId: string, year: number, month: number): string => {
  return `${studentId}-${year}-${String(month).padStart(2, '0')}`;
};

// データをキャッシュに保存
export const setCalendarDataCache = (
  studentId: string, 
  year: number, 
  month: number, 
  data: Map<string, CalendarDataType>,
  maxStayTime: number
): void => {
  const key = generateCacheKey(studentId, year, month);
  cache[key] = {
    timestamp: Date.now(),
    data,
    maxStayTime
  };
};

// キャッシュからデータを取得
export const getCalendarDataCache = (
  studentId: string,
  year: number,
  month: number
): { data: Map<string, CalendarDataType>; maxStayTime: number } | null => {
  const key = generateCacheKey(studentId, year, month);
  const cachedData = cache[key];
  
  if (!cachedData) return null;
  
  // 1時間以上経過したら古いと判断
  const isExpired = Date.now() - cachedData.timestamp > 3600000; // 1時間 = 3600000ミリ秒
  if (isExpired) {
    delete cache[key]; // 古いデータを削除
    return null;
  }
  
  return {
    data: cachedData.data,
    maxStayTime: cachedData.maxStayTime
  };
};

// 特定の学生の全キャッシュを削除
export const clearStudentCache = (studentId: string): void => {
  Object.keys(cache).forEach(key => {
    if (key.startsWith(`${studentId}-`)) {
      delete cache[key];
    }
  });
};

// 特定の年月のキャッシュを削除
export const clearMonthCache = (year: number, month: number): void => {
  Object.keys(cache).forEach(key => {
    if (key.includes(`-${year}-${String(month).padStart(2, '0')}`)) {
      delete cache[key];
    }
  });
};

// キャッシュサイズを取得
export const getCacheSize = (): number => {
  return Object.keys(cache).length;
};

// キャッシュの総メモリ使用量を概算（バイト単位）
export const estimateCacheMemoryUsage = (): number => {
  let totalSize = 0;
  
  Object.values(cache).forEach(cacheItem => {
    // キャッシュメタデータのサイズを追加
    totalSize += 16; // timestamp (8バイト) + maxStayTime (8バイト)
    
    // データマップのサイズを追加
    cacheItem.data.forEach((value, key) => {
      // キー (日付文字列) のサイズ
      totalSize += key.length * 2; // 1文字2バイトと仮定
      
      // 値 (CalendarDataType) のサイズ
      totalSize += 24; // date (10バイト) + stayTimeSeconds (8バイト) + level (4バイト) + オーバーヘッド
    });
  });
  
  return totalSize;
};
