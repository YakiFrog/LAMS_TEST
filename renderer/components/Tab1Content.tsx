import React, { useState, useEffect, useRef } from 'react';
import { Box, Heading, Text, Divider, HStack, Button, Input, FormControl, FormLabel, 
  IconButton, Switch, Tooltip, useDisclosure, Drawer, DrawerBody, DrawerHeader, 
  DrawerOverlay, DrawerContent, DrawerCloseButton, VStack, Badge, Flex, Spacer } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import SampleStudentList from './SampleStudentList';
import { WiDaySunny, WiCloudy, WiRain, WiThunderstorm, WiSnow } from 'react-icons/wi';
import { exportAttendanceToCSV } from '../utils/exportAttendance';
import { useToast } from '@chakra-ui/react';
import { DownloadIcon, TimeIcon, SettingsIcon, ChevronRightIcon, RepeatIcon, AddIcon, MinusIcon } from '@chakra-ui/icons';
import { FaFastForward, FaSearchPlus, FaSearchMinus, FaRedo, FaExpandArrowsAlt } from 'react-icons/fa';
import { getCurrentTime, getJapanTime, setOverrideTime, isTimeOverrideEnabled, getOverrideTime, advanceTimeBy, getJapanTimeISOString } from '../utils/timeManager';

// 型定義: 学生情報
interface Student {
  id: string;
  name: string;
  grade: '教員' | 'M2' | 'M1' | 'B4';
}

// アニメーション定義: バウンスエフェクト
const bounce = keyframes`
  0% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-15px); }
  100% { transform: translateX(-50%) translateY(0); }
`;

// 新規アニメーション定義: 天気アイコンの浮遊アニメーション
const float = keyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0); }
`;

const Tab1Content: React.FC = () => {
  // 状態管理
  const [currentTime, setCurrentTime] = useState<Date>(getCurrentTime());
  const [isMounted, setIsMounted] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [isBouncing, setIsBouncing] = useState(false);
  const [weatherIcon, setWeatherIcon] = useState<React.ReactNode | null>(null);
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);
  
  // ズーム管理用の状態
  const [zoomLevel, setZoomLevel] = useState(100);
  
  // 学年ボックスの参照を保持するref
  const gradeBoxesRef = useRef<HTMLDivElement>(null);
  
  // スクロール検知用のタイマーID
  const scrollCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 時間設定用の状態
  const [timeInputValue, setTimeInputValue] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [timeAdvanceMinutes, setTimeAdvanceMinutes] = useState(30);

  // ハイドレーションエラーを防ぐためのクライアントサイド判定
  const [isClient, setIsClient] = useState(false);

  // コンポーネントの初回マウント時のみ実行
  useEffect(() => {
    setIsMounted(true);
    setIsClient(true); // クライアントサイドであることをマーク
    
    // ローカルストレージからズームレベルを読み込む
    const savedZoom = localStorage.getItem('zoomLevel');
    if (savedZoom) {
      const parsedZoom = parseInt(savedZoom);
      setZoomLevel(parsedZoom);
    }
  }, []);

  // useEffect 2: 初回マウント後に開始し、1秒ごとに時計を更新
  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    if (!isMounted) return;
    
    const intervalId = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);
    return () => clearInterval(intervalId);
  }, [isMounted]);

  // useEffect 3: 初回マウント時のみ実行
  // localStorageから保存済みの学生情報を読み込む
  useEffect(() => {
    const storedStudents = localStorage.getItem('students');
    if (storedStudents) {
      setStudents(JSON.parse(storedStudents));
    }
  }, []);

  // 学年ごとに学生をグループ化
  const studentsByGrade = {
    教員: students.filter(s => s.grade === '教員'),
    M2: students.filter(s => s.grade === 'M2'),
    M1: students.filter(s => s.grade === 'M1'),
    B4: students.filter(s => s.grade === 'B4'),
  };

  // 時計クリック時の処理: バウンスエフェクトとページリロード
  const handleClockClick = () => {
    // バウンス状態を有効化
    setIsBouncing(true);
    // ページリロード
    window.location.reload();

    // すぐにバウンス終了を設定
    setTimeout(() => {
      setIsBouncing(false);
    }, 200); // 適宜調整
  };

  // OpenWeatherMapAPIから天気情報を取得し、localStorageに保存
  const getWeatherIcon = async () => {
    try {
      // 保存済みの天気情報を取得
      const savedWeather = localStorage.getItem('weatherType');
      const savedTime = localStorage.getItem('weatherTimestamp');

      if (savedWeather && savedTime) {
        const timestamp = parseInt(savedTime);
        const now = Date.now();
        const timeDiff = now - timestamp;
        
        console.log('保存された天気データ:', {
          weatherType: savedWeather,
          savedTime: new Date(timestamp).toLocaleString(),
          currentTime: new Date(now).toLocaleString(),
          timeDiff: Math.floor(timeDiff / 1000 / 60) + '分経過'
        });

        if (timeDiff < 30 * 60 * 1000) {
          console.log('ローカルストレージのデータを使用します');
          // 保存済みの天気データに応じたアイコンを設定
          switch (savedWeather) {
            case 'Clear':
              setWeatherIcon(<WiDaySunny />);
              break;
            case 'Clouds':
              setWeatherIcon(<WiCloudy />);
              break;
            case 'Rain':
              setWeatherIcon(<WiRain />);
              break;
            case 'Thunderstorm':
              setWeatherIcon(<WiThunderstorm />);
              break;
            case 'Snow':
              setWeatherIcon(<WiSnow />);
              break;
          }
          return;
        }
        console.log('保存データが30分以上経過しているため、新しいデータを取得します');
      } else {
        console.log('保存された天気データがないため、新しいデータを取得します');
      }

      // APIから最新の天気情報を取得
      const apiKey = 'b3c349ce219ca5db2d21213b3e403879';
      const city = 'Osaka';
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
      const response = await fetch(url);
      const data = await response.json();
      const weather = data.weather[0].main;

      // 取得した天気情報に応じたアイコンを設定
      switch (weather) {
        case 'Clear':
          setWeatherIcon(<WiDaySunny />);
          break;
        case 'Clouds':
          setWeatherIcon(<WiCloudy />);
          break;
        case 'Rain':
          setWeatherIcon(<WiRain />);
          break;
        case 'Thunderstorm':
          setWeatherIcon(<WiThunderstorm />);
          break;
        case 'Snow':
          setWeatherIcon(<WiSnow />);
          break;
        default:
          setWeatherIcon(null);
          return;
      }

      // 新しい天気データをlocalStorageに保存
      localStorage.setItem('weatherType', weather);
      localStorage.setItem('weatherTimestamp', Date.now().toString());

    } catch (error) {
      console.error("Failed to fetch weather data", error);
      setWeatherIcon(null);
    }
  };

  // useEffect 4: 初回マウント時に実行し、その後30分ごとに更新
  // 天気情報の取得と定期更新
  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    getWeatherIcon();
    const intervalId = setInterval(getWeatherIcon, 30 * 60 * 1000); // setIntervalで30分ごとに更新
    return () => clearInterval(intervalId); // メモリリーク防止
  }, []);

  // 手動エクスポート実行関数
  const handleManualExport = async () => {
    const exportPath = localStorage.getItem('exportPath');
    if (!exportPath) {
      toast({
        title: "エクスポートエラー",
        description: "エクスポート先が設定されていません。管理タブで設定してください。",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setIsExporting(true);
    
    try {
      // 出勤データを取得
      const attendanceStates = JSON.parse(localStorage.getItem('attendanceStates') || '{}');
      
      // CSVエクスポート実行
      const result = await exportAttendanceToCSV(attendanceStates, students, true);
      
      if (result.success) {
        toast({
          title: "エクスポート成功",
          description: result.message,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: "エクスポート失敗",
          description: result.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('手動エクスポートエラー:', error);
      toast({
        title: "エクスポートエラー",
        description: `エクスポート処理中にエラーが発生しました: ${error}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // 時間設定を適用する関数
  const applyTimeOverride = () => {
    if (!timeInputValue) {
      toast({
        title: "入力エラー",
        description: "有効な日時を入力してください",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      // 入力された日時文字列をDateオブジェクトに変換
      const customDate = new Date(timeInputValue);
      
      if (isNaN(customDate.getTime())) {
        throw new Error("無効な日時形式です");
      }
      
      // 時間オーバーライドを設定
      setOverrideTime(customDate);
      
      // 現在時刻を更新
      setCurrentTime(customDate);
      
      toast({
        title: "時間設定を適用しました",
        description: `システム時間を ${customDate.toLocaleString()} に設定しました`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      // 時間設定が触りやすいようドロワーを開いたままにする
    } catch (error) {
      toast({
        title: "時間設定エラー",
        description: `${error}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // 時間設定をリセットする関数
  const resetTimeOverride = () => {
    setOverrideTime(null);
    setCurrentTime(new Date());
    setTimeInputValue('');
    
    toast({
      title: "時間設定をリセットしました",
      description: "実際のシステム時間を使用します",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  // 現在時刻を時間設定フィールドに設定する関数
  const setCurrentTimeToInput = () => {
    // getJapanTimeISOString 関数を使用して日本時間の正しい形式を取得
    const formattedDateTime = getJapanTimeISOString();
    setTimeInputValue(formattedDateTime);
    
    toast({
      title: "現在時刻を設定しました",
      description: "日本時間を入力フィールドに設定しました",
      status: "info",
      duration: 2000,
      isClosable: true,
    });
  };

  // 時間を進める関数
  const handleAdvanceTime = () => {
    advanceTimeBy(timeAdvanceMinutes);
    setCurrentTime(getCurrentTime());
    
    toast({
      title: "時間を進めました",
      description: `${timeAdvanceMinutes}分進めて ${getCurrentTime().toLocaleString()} になりました`,
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  // カスタム22:30に設定する関数
  const setTo2230 = () => {
    const now = new Date();
    now.setHours(22, 30, 0, 0);
    setOverrideTime(now);
    setCurrentTime(now);
    setTimeInputValue(now.toISOString().slice(0, 16));
    
    toast({
      title: "22:30に設定しました",
      description: "自動退勤処理のテスト用に22:30に設定しました",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  // 次の日の0:01に設定する関数
  const setToNextDay = () => {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    now.setHours(0, 1, 0, 0);
    setOverrideTime(now);
    setCurrentTime(now);
    setTimeInputValue(now.toISOString().slice(0, 16));
    
    toast({
      title: "翌日0:01に設定しました",
      description: "日付変更処理のテスト用に翌日の0:01に設定しました",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  // ズームイン処理
  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel + 10, 150); // 最大150%まで
    setZoomLevel(newZoom);
    localStorage.setItem('zoomLevel', newZoom.toString());
    
    toast({
      title: "ズームイン",
      description: `表示を${newZoom}%に拡大しました`,
      status: "info",
      duration: 2000,
      isClosable: true,
      position: "bottom-right"
    });
  };

  // ズームアウト処理
  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel - 10, 70); // 最小70%まで
    setZoomLevel(newZoom);
    localStorage.setItem('zoomLevel', newZoom.toString());
    
    toast({
      title: "ズームアウト",
      description: `表示を${newZoom}%に縮小しました`,
      status: "info",
      duration: 2000,
      isClosable: true,
      position: "bottom-right"
    });
  };

  // ズームリセット処理
  const handleZoomReset = () => {
    setZoomLevel(100);
    localStorage.setItem('zoomLevel', "100");
    
    toast({
      title: "ズームリセット",
      description: "表示を100%に戻しました",
      status: "info",
      duration: 2000,
      isClosable: true,
      position: "bottom-right"
    });
  };

  // オートリサイズ処理（改良版）
  const handleAutoResize = () => {
    // ウィンドウの使用可能な高さを取得
    const windowHeight = window.innerHeight;
    
    // 学年ボックスが含まれるコンテナの位置を取得
    if (!gradeBoxesRef.current) return;
    
    // コンテナの上部位置を取得（スクロール位置を考慮）
    const containerRect = gradeBoxesRef.current.getBoundingClientRect();
    const containerTop = containerRect.top + window.scrollY;
    
    // 各学年ボックスの高さを取得
    const gradeBoxes = gradeBoxesRef.current.querySelectorAll('.grade-box');
    if (gradeBoxes.length === 0) return;
    
    // 各ボックスの高さとマージンを計算に入れる
    let totalHeight = 0;
    gradeBoxes.forEach((box) => {
      const style = window.getComputedStyle(box as HTMLElement);
      const marginBottom = parseFloat(style.marginBottom);
      const boxHeight = (box as HTMLElement).offsetHeight;
      totalHeight += boxHeight + marginBottom;
    });
    
    // 余裕を持たせるためのマージン（下部に少し空間を作る）
    const bottomMargin = 30;
    
    // 使用可能な高さを計算
    const availableHeight = windowHeight - containerTop - bottomMargin;
    
    // スクロールされない最大の大きさを計算
    const optimalZoom = Math.floor((availableHeight / totalHeight) * 100);
    
    console.log('Auto resize calculation:', {
      windowHeight,
      containerTop,
      totalContentHeight: totalHeight,
      availableHeight,
      calculatedZoom: optimalZoom
    });
    
    // ズームレベルを制限（70%〜150%）
    const newZoom = Math.max(70, Math.min(150, optimalZoom));
    
    // 現在と同じズームレベルなら何もしない
    if (newZoom === zoomLevel) {
      // スクロールのセーフティチェック - 少し値を小さくしてみる
      setTimeout(() => {
        if (document.documentElement.scrollHeight > window.innerHeight) {
          const adjustedZoom = Math.max(70, newZoom - 5);
          suppressAutoResizeToast.current = true;
          setZoomLevel(adjustedZoom);
          localStorage.setItem('zoomLevel', adjustedZoom.toString());
          console.log(`スクロールが検出されたため、ズームを ${adjustedZoom}% に調整しました`);
        }
      }, 300);
      return;
    }
    
    // ズームレベルを設定
    setZoomLevel(newZoom);
    localStorage.setItem('zoomLevel', newZoom.toString());
    
    // 通知が抑制されていない場合のみトーストを表示
    if (!suppressAutoResizeToast.current) {
      toast({
        title: "オートリサイズ",
        description: `表示を${newZoom}%に最適化しました`,
        status: "info",
        duration: 2000,
        isClosable: true,
        position: "bottom-right"
      });
    }
    
    // 通知抑制フラグをリセット
    suppressAutoResizeToast.current = false;
  };

  // 自動リサイズ通知のトースト表示を抑制するフラグ
  const suppressAutoResizeToast = useRef(false);

  // 出退勤状態が変わったときのハンドラ
  const handleAttendanceChange = (hasChanged: boolean) => {
    // 実際に変更があった場合のみオートリサイズを実行
    if (hasChanged) {
      console.log("出退勤状態が変更されました - オートリサイズを実行します");
      
      // 少し遅延させてオートリサイズを実行
      // これは出退勤変更による名前パネルのサイズ変更が完了した後に実行するため
      if (localStorage.getItem('autoResizeOnAttendanceChange') !== 'false') {
        suppressAutoResizeToast.current = false; // 通常の通知を表示
        setTimeout(() => {
          handleAutoResize();
        }, 500);
      }
    }
  };

  // 初回マウント/リサイズ時のオートリサイズ実行（通知抑制付き）
  const handleInitialAutoResize = () => {
    // トースト通知を抑制
    suppressAutoResizeToast.current = true;
    handleAutoResize();
  };

  // ウィンドウサイズ変更時に自動リサイズするuseEffect
  useEffect(() => {
    const handleResize = () => {
      // ウィンドウサイズ変更時に少し遅延してオートリサイズを実行
      if (localStorage.getItem('autoResizeEnabled') === 'true') {
        suppressAutoResizeToast.current = true; // リサイズ時の通知を抑制
        setTimeout(handleAutoResize, 300); // 300ms遅延で実行
      }
    };

    window.addEventListener('resize', handleResize);
    
    // 初回マウント時にオートリサイズを一度実行（通知抑制）
    if (localStorage.getItem('autoResizeEnabled') === 'true') {
      // DOM完全レンダリング後に実行
      setTimeout(handleInitialAutoResize, 500);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // スクロールが発生しているかどうかを監視するuseEffect
  useEffect(() => {
    const checkForScroll = () => {
      // スクロールが発生しているかをチェック
      if (document.documentElement.scrollHeight > window.innerHeight) {
        console.log('スクロールが発生しています - オートリサイズを実行します');
        
        // 現在のズームレベルを少し縮小して再度オートリサイズ
        const newZoom = Math.max(70, zoomLevel - 5);
        if (newZoom !== zoomLevel) {
          suppressAutoResizeToast.current = true; // 中間調整の通知を抑制
          setZoomLevel(newZoom);
          localStorage.setItem('zoomLevel', newZoom.toString());
          
          // 少し遅延させて再チェック（ズームレベル変更後の再レンダリングを待つ）
          scrollCheckTimerRef.current = setTimeout(checkForScroll, 300);
        }
      }
    };
    
    // 初期ロード時とリサイズ後に実行
    const handleScrollCheck = () => {
      // 既存のタイマーをクリア
      if (scrollCheckTimerRef.current) {
        clearTimeout(scrollCheckTimerRef.current);
      }
      
      // 少し遅延させてスクロールチェックを実行（レイアウト調整後）
      scrollCheckTimerRef.current = setTimeout(checkForScroll, 300);
    };
    
    // ズームレベルが変わるたびにスクロールチェック
    handleScrollCheck();
    
    // クリーンアップ関数
    return () => {
      if (scrollCheckTimerRef.current) {
        clearTimeout(scrollCheckTimerRef.current);
      }
    };
  }, [zoomLevel]);

  return (
    <Box p={6} height="0vh">
      {/* SVGフィルター定義: アイコンに影効果 */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="outline">
            <feMorphology in="SourceAlpha" result="DILATED" operator="dilate" radius="2"/>
            <feGaussianBlur in="DILATED" stdDeviation="4.5" result="BLURRED"/>
            <feFlood floodColor="black" floodOpacity="0.65" result="OUTLINE"/>
            <feComposite in="OUTLINE" in2="BLURRED" operator="in" result="OUTLINE_FILL"/>
            <feMerge>
              <feMergeNode in="OUTLINE_FILL"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* ズームコントロールパネル */}
      <Box
        position="absolute"
        top="9%"
        right="5%"
        zIndex={1000}
        bg="#131113"
        py={2}
        px={4}
        borderRadius="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
        boxShadow="0 2px 5px rgba(0, 0, 0, 0.8)"
      >
        <HStack spacing={2}>
          <Tooltip label="ズームアウト (-10%)">
            <IconButton
              aria-label="ズームアウト"
              icon={<FaSearchMinus />}
              size="md"
              colorScheme="blue"
              variant="ghost"
              color="white"
              onClick={handleZoomOut}
              isDisabled={zoomLevel <= 70}
              _hover={{ bg: "rgba(255,255,255,0.2)" }}
            />
          </Tooltip>
          
          <Badge colorScheme="blue" fontSize="sm" px={2} py={1} borderRadius="md">
            {zoomLevel}%
          </Badge>
          
          <Tooltip label="ズームイン (+10%)">
            <IconButton
              aria-label="ズームイン"
              icon={<FaSearchPlus />}
              size="md"
              colorScheme="blue"
              variant="ghost"
              color="white"
              onClick={handleZoomIn}
              isDisabled={zoomLevel >= 150}
              _hover={{ bg: "rgba(255,255,255,0.2)" }}
            />
          </Tooltip>
          
          <Tooltip label="ズームリセット (100%)">
            <IconButton
              aria-label="ズームリセット"
              icon={<FaRedo />}
              size="md"
              colorScheme="blue"
              variant="ghost"
              color="white"
              onClick={handleZoomReset}
              isDisabled={zoomLevel === 100}
              _hover={{ bg: "rgba(255,255,255,0.2)" }}
            />
          </Tooltip>
          
          <Tooltip label="オートリサイズ (スクロールなしで表示)">
            <IconButton
              aria-label="オートリサイズ"
              icon={<FaExpandArrowsAlt />}
              size="md"
              colorScheme="green"
              variant="ghost"
              color="white"
              onClick={handleAutoResize}
              _hover={{ bg: "rgba(255,255,255,0.2)" }}
            />
          </Tooltip>
        </HStack>
      </Box>

      {/* 現在時刻と天気アイコンを表示するボックス */}
      <Box
        position="absolute"
        top="9%"
        left="50%"
        transform="translateX(-50%)"
        zIndex={1000}
        bg="#131113"
        py={3}
        px={8}  // 10から6に変更して横幅を小さく
        borderRadius="full"
        onClick={handleClockClick} // リロード処理を実行
        cursor="pointer"
        transition="transform 0.1s ease-in-out"
        animation={isBouncing ? `${bounce} 0.1s ease-out` : 'none'}
        transformOrigin="bottom"
        display="flex"
        alignItems="center"
        justifyContent="center"
        width="auto" // 幅を調整
        minWidth="32vw" // 42vwから32vwに変更して横幅を小さく
        height="auto" // 高さをコンテンツに合わせて自動調整
        boxShadow="0 2px 5px rgba(0, 0, 0, 0.8)"
        whiteSpace="nowrap"
      >
        <Text fontSize="3xl" fontWeight="bold" color="white" userSelect="none" mr={2} letterSpacing="wider">
          {/* 日付と時刻の表示 - クライアントサイドでのみレンダリング */}
          {isClient && isMounted && (
            <>
              {currentTime.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
              {"　"}
              {currentTime.toLocaleTimeString('ja-JP')}
            </>
          )}
        </Text>
        {/* 時間オーバーライド中の場合のバッジ - クライアントサイドでのみレンダリング */}
        {isClient && isTimeOverrideEnabled() && (
          <Badge
            position="absolute"
            top="-40%"
            left="50%"
            transform="translateX(-50%)"
            colorScheme="red"
            fontSize="sm"
            px={3}
            py={1}
            borderRadius="full"
            boxShadow="0 0 5px rgba(255, 0, 0, 0.5)"
          >
            時間操作モード
          </Badge>
        )}
        {/* 時間設定アイコン */}
        <Tooltip label="時間設定">
          <IconButton
            aria-label="時間設定"
            icon={<TimeIcon />}
            colorScheme="blue"
            variant="ghost"
            fontSize="lg"
            color="white"
            _hover={{ bg: "rgba(255,255,255,0.2)" }}
            onClick={(e) => {
              e.stopPropagation(); // ここが重要：親要素へのイベント伝播を停止
              onOpen();
            }}
          />
        </Tooltip>
        {/* 天気アイコンが設定されていれば表示 */}
        {weatherIcon && (
          <Box
            position="absolute"
            right={"-3.5%"}
            bottom={"-30%"}
            as="span"
            fontSize="7xl"
            color="white"
            ml={2}
            userSelect="none"
            css={{
              filter: 'url(#outline)',
              animation: `${float} 5s ease-in-out infinite`,
            }}
          >
            {weatherIcon}
          </Box>
        )}
      </Box>

      {/* 時間設定ドロワー */}
      <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" bg="blue.50">
            <Flex align="center">
              <TimeIcon mr={2} />
              <Text>時間操作設定（デバッグ用）</Text>
              <Spacer />
              <Badge colorScheme={isTimeOverrideEnabled() ? "red" : "gray"} fontSize="sm" p={1} borderRadius="md">
                {isTimeOverrideEnabled() ? "有効" : "無効"}
              </Badge>
            </Flex>
          </DrawerHeader>

          <DrawerBody>
            <VStack spacing={5} align="stretch" mt={4}>
              <Box bg="yellow.50" p={3} borderRadius="md" borderWidth="1px" borderColor="yellow.300">
                <Text fontSize="sm" color="orange.700">
                  この機能は開発およびテスト目的でのみ使用してください。時間関連のイベント・処理をシミュレートするためのものです。
                </Text>
              </Box>

              <FormControl>
                <FormLabel htmlFor="datetime-input">日時設定：</FormLabel>
                <Input
                  id="datetime-input"
                  type="datetime-local"
                  value={timeInputValue}
                  onChange={(e) => setTimeInputValue(e.target.value)}
                  mb={2}
                />
                <HStack>
                  <Button onClick={applyTimeOverride} colorScheme="blue" leftIcon={<SettingsIcon />}>
                    適用
                  </Button>
                  <Button onClick={setCurrentTimeToInput} colorScheme="teal" leftIcon={<RepeatIcon />}>
                    現在時刻を設定
                  </Button>
                  <Button onClick={resetTimeOverride} colorScheme="gray">
                    リセット
                  </Button>
                </HStack>
              </FormControl>

              <Divider />

              <FormControl>
                <FormLabel>時間を進める：</FormLabel>
                <HStack>
                  <Input
                    type="number"
                    value={timeAdvanceMinutes}
                    onChange={(e) => setTimeAdvanceMinutes(parseInt(e.target.value))}
                    width="100px"
                    min={1}
                  />
                  <Text>分</Text>
                  <Button 
                    onClick={handleAdvanceTime} 
                    colorScheme="purple" 
                    leftIcon={<FaFastForward />}
                    isDisabled={!isTimeOverrideEnabled()}
                  >
                    時間を進める
                  </Button>
                </HStack>
              </FormControl>

              <Divider />

              <Box>
                <Text fontWeight="bold" mb={2}>テスト用プリセット：</Text>
                <HStack spacing={4} wrap="wrap">
                  <Button onClick={setTo2230} colorScheme="orange" leftIcon={<ChevronRightIcon />} size="sm">
                    22:30に設定 (自動退勤)
                  </Button>
                  <Button onClick={setToNextDay} colorScheme="red" leftIcon={<ChevronRightIcon />} size="sm">
                    翌日0:01に設定 (日付変更)
                  </Button>
                </HStack>
              </Box>

              <Divider />

              {isTimeOverrideEnabled() && getOverrideTime() && (
                <Box bg="blue.50" p={3} borderRadius="md">
                  <Text fontWeight="bold">現在の設定時間：</Text>
                  <Text>{getOverrideTime()?.toLocaleString()}</Text>
                </Box>
              )}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* 学生情報を学年別に表示 */}
      <Box mt={24} ref={gradeBoxesRef}>
        {Object.entries(studentsByGrade).map(([grade, gradeStudents]) => (
          <Box key={grade} mb={10} userSelect="none" position="relative"
            borderWidth="5px"
            borderColor="#131113"
            borderRadius="3xl"
            px={6}
            pt={3}
            pb={1}
            mt={2}
            // ドロップシャドウを設定
            boxShadow="0 3px 10px rgba(0, 0, 0, 0.6)"
            color="#131113"
            bg="white"
            className="grade-box" // オートリサイズ用のクラス名を追加
          >
              <Heading as="h2" size="xl" color="white" bg="#131113" p={2} borderRadius="full"
              width="11vw" px={0} position="absolute" top={0} transform="translate(0%, -50%)"
              textAlign="center" userSelect="none" letterSpacing="wider" boxShadow="0 3px 10px rgba(0, 0, 0, 0.4)"
              >
                {grade}
              </Heading>
              <Box mt={8} mb={4}>
                <SampleStudentList 
                  students={gradeStudents} 
                  zoomLevel={zoomLevel} 
                  onAttendanceChange={handleAttendanceChange} // 出退勤変更時のコールバックを渡す
                />
              </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default Tab1Content;