import React, { useState, useEffect } from 'react';
import { Box, Heading, Text, Divider } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import SampleStudentList from './SampleStudentList';
import { WiDaySunny, WiCloudy, WiRain, WiThunderstorm, WiSnow } from 'react-icons/wi';
import { exportAttendanceToCSV } from '../utils/exportAttendance';
import { Button, useToast } from '@chakra-ui/react';
import { DownloadIcon } from '@chakra-ui/icons';

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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [isBouncing, setIsBouncing] = useState(false);
  const [weatherIcon, setWeatherIcon] = useState<React.ReactNode | null>(null);
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);

  // useEffect 1: コンポーネントの初回マウント時のみ実行
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // useEffect 2: 初回マウント後に開始し、1秒ごとに時計を更新
  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    if (!isMounted) return;
    
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
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

      {/* 現在時刻と天気アイコンを表示するボックス */}
      <Box
        position="absolute"
        top="9%"
        left="50%"
        transform="translateX(-50%)"
        zIndex={1000}
        bg="#131113"
        py={3}
        px={10}
        borderRadius="full"
        onClick={handleClockClick}
        cursor="pointer"
        transition="transform 0.1s ease-in-out"
        animation={isBouncing ? `${bounce} 0.1s ease-out` : 'none'}
        transformOrigin="bottom"
        display="flex"
        alignItems="center"
        justifyContent="center"
        width="42vw" // 幅をコンテンツに合わせて自動調整
        height="auto" // 高さをコンテンツに合わせて自動調整
        boxShadow="0 2px 5px rgba(0, 0, 0, 0.8)"
        whiteSpace="nowrap"
      >
        <Text fontSize="3xl" fontWeight="bold" color="white" userSelect="none" mr={2} letterSpacing="wider">
          {/* 日付と時刻の表示 */}
          {isMounted && (
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

      {/* 学生情報を学年別に表示 */}
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
        >
            <Heading as="h2" size="xl" color="white" bg="#131113" p={2} borderRadius="full"
            width="11vw" px={0} position="absolute" top={0} transform="translate(0%, -50%)"
            textAlign="center" userSelect="none" letterSpacing="wider" boxShadow="0 3px 10px rgba(0, 0, 0, 0.4)"
            >
              {grade}
            </Heading>
            <Box mt={8} mb={4}>
              <SampleStudentList students={gradeStudents}/>
            </Box>
        </Box>
      ))}

      {/* エクスポートボタン */}
      <Button
        position="absolute"
        bottom="20px"
        right="20px"
        colorScheme="purple"
        leftIcon={<DownloadIcon />}
        onClick={handleManualExport}
        isLoading={isExporting}
        loadingText="エクスポート中..."
        zIndex={1000}
        boxShadow="lg"
        isDisabled={isExporting}
      >
        出勤データをエクスポート
      </Button>
    </Box>
  );
};

export default Tab1Content;