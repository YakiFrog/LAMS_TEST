import { extendTheme } from '@chakra-ui/react'

const fonts = { mono: `'Menlo', monospace` }

const breakpoints = {
  sm: '40em',
  md: '52em',
  lg: '64em',
  xl: '80em',
}

// アプリケーション全体で使用する統一カラーテーマ
const colors = {
  primary: {
    50: '#e5f0ff',
    100: '#b8d3ff',
    200: '#8ab5ff',
    300: '#5c97ff',
    400: '#2e79ff',
    500: '#0f5fe6', // 基本の青
    600: '#0849b3',
    700: '#063580',
    800: '#03214f',
    900: '#010d20',
  },
  secondary: {
    50: '#ffe8e8',
    100: '#ffbdbd',
    200: '#ff9292',
    300: '#ff6767',
    400: '#ff3c3c',
    500: '#e62323', // 基本の赤
    600: '#b31919',
    700: '#801111',
    800: '#500a0a',
    900: '#210505',
  },
  accent: {
    50: '#f6e8ff',
    100: '#e3bfff',
    200: '#cd95ff',
    300: '#b96bff',
    400: '#a441ff',
    500: '#8b28e6', // アクセントカラー（紫）
    600: '#6c1eb3',
    700: '#4d1580',
    800: '#2f0c4f',
    900: '#14051f',
  },
  neutral: {
    50: '#f2f2f2',
    100: '#d9d9d9',
    200: '#bfbfbf',
    300: '#a6a6a6',
    400: '#8c8c8c',
    500: '#737373',
    600: '#595959',
    700: '#404040',
    800: '#262626',
    900: '#131113', // ダークカラー（ほぼ黒）
  },
  success: {
    50: '#e6ffed',
    100: '#b3ffcb',
    200: '#80ffab',
    300: '#4dff8b',
    400: '#24ff72',
    500: '#1ce640', // 成功色（緑）
    600: '#15b32f',
    700: '#108023',
    800: '#0a4f16',
    900: '#042008',
  },
}

// YearlyAttendanceCalendarで使用する色の強度レベル
const calendarColors = {
  attendanceCalendar: [
    'rgb(235, 237, 240)', // レベル0: 出勤なし
    'rgb(255, 200, 200)', // レベル1: 少し
    'rgb(255, 150, 150)', // レベル2: やや少なめ
    'rgb(255, 100, 100)', // レベル3: 中程度
    'rgb(200, 0, 0)'      // レベル4: 長時間
  ]
};

// WeekdayAttendanceIndicatorで使用する色の強度レベル
const weekdayColors = {
  attendanceIndicator: [
    'rgb(255, 200, 200)', // レベル0: 出勤あり（滞在時間なし/不明）
    'rgb(255, 180, 180)', // レベル1: 少し
    'rgb(255, 150, 150)', // レベル2: やや少なめ
    'rgb(255, 100, 100)', // レベル3: 中程度
    'rgb(200, 0, 0)'      // レベル4: 長時間
  ]
};

// AttendanceRankingで使用するランキング色
const rankingColors = [
  { // 1位
    bg: "linear-gradient(135deg, #FFD700 10%, #FFC800 40%, #FFD700 60%, #FFEF9A 100%)", 
    text: "#131113", 
    border: "#FFB700", 
    shadowColor: "rgba(255, 215, 0, 0.6)",
    highlight: "rgba(255, 255, 200, 0.7)"
  },
  { // 2位
    bg: "linear-gradient(135deg, #E8E8E8 10%, #C0C0C0 40%, #D8D8D8 60%, #F5F5F5 100%)", 
    text: "#131113", 
    border: "#A0A0A0", 
    shadowColor: "rgba(192, 192, 192, 0.6)",
    highlight: "rgba(255, 255, 255, 0.7)"
  }, 
  { // 3位
    bg: "linear-gradient(135deg, #CD7F32 10%, #A05B2C 40%, #CD7F32 60%, #E0A872 100%)", 
    text: "#131113", 
    border: "#B06000", 
    shadowColor: "rgba(205, 127, 50, 0.6)",
    highlight: "rgba(255, 235, 205, 0.7)"
  }, 
  { // 4位
    bg: "linear-gradient(135deg, #E2E8F0 10%, #CBD5E0 40%, #E2E8F0 60%, #EDF2F7 100%)", 
    text: "#131113", 
    border: "#CBD5E0", 
    shadowColor: "rgba(160, 174, 192, 0.4)",
    highlight: "rgba(255, 255, 255, 0.5)"
  }, 
  { // 5位
    bg: "linear-gradient(135deg, #F7FAFC 10%, #EDF2F7 40%, #F7FAFC 60%, #FFFFFF 100%)", 
    text: "#131113", 
    border: "#E2E8F0", 
    shadowColor: "rgba(160, 174, 192, 0.3)",
    highlight: "rgba(255, 255, 255, 0.5)"
  },
];

// トロフィーアイコンカラー
const trophyColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

// 学年バッジカラー
const gradeBadgeColors = {
  教員: 'purple',
  M2: 'blue',
  M1: 'green',
  B4: 'orange'
};

const theme = extendTheme({
  semanticTokens: {
    colors: {
      text: {
        default: '#16161D',
        _dark: '#ade3b8',
      },
      heroGradientStart: {
        default: '#7928CA',
        _dark: '#e3a7f9',
      },
      heroGradientEnd: {
        default: '#FF0080',
        _dark: '#fbec8f',
      },
      appBackground: '#131113',  // アプリの背景色
    },
    radii: {
      button: '12px',
    },
  },
  colors,
  fonts,
  breakpoints,
  // テーマの拡張部分
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  // カスタムテーマプロパティ
  customTheme: {
    calendarColors,
    weekdayColors,
    rankingColors,
    trophyColors,
    gradeBadgeColors
  }
})

export default theme
