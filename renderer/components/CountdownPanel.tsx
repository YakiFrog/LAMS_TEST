import React, { useState, useEffect } from 'react';
import { Box, Text, Flex, Badge, Divider, Tooltip, IconButton } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { loadCountdownEventsFromCSV, CountdownEvent } from '../utils/countdownManager';
import { getCurrentTime, isTimeOverrideEnabled } from '../utils/timeManager';
import { TimeIcon } from '@chakra-ui/icons';

// アニメーションの定義
const fadeOut = keyframes`
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-20px); }
`;

const fadeIn = keyframes`
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
`;

interface CountdownPanelProps {
  transitionInterval?: number; // 切り替え間隔（ミリ秒）
  currentTime: Date; // 現在時刻を受け取るプロパティを追加
  onTimeSettingClick?: () => void; // 時間設定クリックハンドラ
  onClockClick?: () => void; // 時計クリックハンドラ
  isBouncing?: boolean; // バウンスアニメーション状態
}

const CountdownPanel: React.FC<CountdownPanelProps> = ({ 
  transitionInterval = 15000,
  currentTime,
  onTimeSettingClick,
  onClockClick,
  isBouncing = false
}) => {
  const [events, setEvents] = useState<CountdownEvent[]>([]);
  const [currentEventIndex, setCurrentEventIndex] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // サンプルデータ（データがない場合に表示）
  const sampleEvents: CountdownEvent[] = [
    {
      name: "卒研提出",
      date: new Date(new Date().getFullYear(), new Date().getMonth() + 3, 15), // 3ヶ月後
      daysRemaining: Math.floor((new Date(new Date().getFullYear(), new Date().getMonth() + 3, 15).getTime() - getCurrentTime().getTime()) / (1000 * 60 * 60 * 24)),
      target: "B4" // 対象学年を追加
    },
    {
      name: "発表会",
      date: new Date(new Date().getFullYear(), new Date().getMonth() + 4, 20), // 4ヶ月後
      daysRemaining: Math.floor((new Date(new Date().getFullYear(), new Date().getMonth() + 4, 20).getTime() - getCurrentTime().getTime()) / (1000 * 60 * 60 * 24)),
      target: "M1" // 対象学年を追加
    },
    {
      name: "論文締切",
      date: new Date(new Date().getFullYear(), new Date().getMonth() + 2, 10), // 2ヶ月後
      daysRemaining: Math.floor((new Date(new Date().getFullYear(), new Date().getMonth() + 2, 10).getTime() - getCurrentTime().getTime()) / (1000 * 60 * 60 * 24)),
      target: "全員" // 対象学年を追加
    }
  ];

  // 学年ごとのバッジカラーを定義
  const gradeBadgeColors: Record<string, string> = {
    '全員': 'purple',
    '教員': 'teal',
    'M2': 'blue',
    'M1': 'green',
    'B4': 'orange'
  };

  // 予定の読み込み
  useEffect(() => {
    const loadEvents = async () => {
      setIsLoading(true);
      const loadedEvents = await loadCountdownEventsFromCSV();
      
      // 読み込んだイベントがある場合はそれを使用、なければサンプルデータを使用
      if (loadedEvents.length > 0) {
        setEvents(loadedEvents);
      } else {
        setEvents(sampleEvents);
      }
      setIsLoading(false);
    };

    loadEvents();

    // 1分ごとにデータを更新（日付が変わった場合に残り日数を更新するため）
    const intervalId = setInterval(loadEvents, 60000);
    return () => clearInterval(intervalId);
  }, []);

  // 表示する予定の切り替え
  useEffect(() => {
    if (events.length <= 1) return;

    const timerId = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentEventIndex(prevIndex => (prevIndex + 1) % events.length);
        setIsAnimating(false);
      }, 500); // フェードアウトの時間
    }, transitionInterval);

    return () => clearInterval(timerId);
  }, [events.length, transitionInterval]);

  // 統合パネルのバウンスアニメーション
  const bounce = keyframes`
    0% { transform: translateY(0); }
    50% { transform: translateY(-15px); }
    100% { transform: translateY(0); }
  `;

  // 読み込み中の状態表示
  if (isLoading) {
    return (
      <Box
        p={4} 
        borderRadius="full"
        bg="#131113"
        color="white"
        minWidth="50vw"
        maxWidth="800px"
        textAlign="center"
      >
        <Text fontSize="md">情報を読み込み中...</Text>
      </Box>
    );
  }

  // イベントが設定されている場合（サンプルデータを含む）
  const currentEvent = events[currentEventIndex];

  return (
    <Box
      p={2}
      py={1} // 上下のパディングをさらに減らす
      pt={1.5} // 左側のパディングをさらに減らす
      borderRadius="full"
      bg="#131113"
      color="white"
      boxShadow="0 2px 5px rgba(0, 0, 0, 0.8)"
      minWidth="55vw"
      maxWidth="auto"
      whiteSpace="nowrap" // 改行を防止
      textAlign="center"
      onClick={onClockClick}
      cursor="pointer"
      transition="transform 0.1s ease-in-out"
      animation={isBouncing ? `${bounce} 0.1s ease-out` : 'none'}
      transformOrigin="center"
      position="relative"
    >
      {/* 時間オーバーライド中の場合のバッジ */}
      {isTimeOverrideEnabled() && (
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
      
      <Flex width="100%" flexWrap="nowrap" p={2}>
        {/* 時計部分 (左側) */}
        <Box flex="0 1 auto" pl={10} pr={5}>
          <Text fontSize="3xl" fontWeight="bold" color="white" userSelect="none" letterSpacing="-0.02em">
            {currentTime.toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            })}
            {"　"}
            {currentTime.toLocaleTimeString('ja-JP')}
          </Text>
        </Box>
        
        {/* 区切り線 */}
        <Flex justifyContent="flex-end" flex="1 1 auto" align="center">
          <Divider orientation="vertical" height="30px" mx={1} opacity={0.4} />
        </Flex>
        
        {/* カウントダウン部分 (右側) */}
        <Flex flex="0 1 auto" align="center" justify="space-between" pl={5} pr={5}>
          {/* 対象学年バッジとイベント名 */}
          <Flex align="center" overflow="hidden" mr={1}> {/* マージンを縮小 */}
            <Box animation={isAnimating ? `${fadeOut} 0.5s forwards` : `${fadeIn} 0.5s`}>
              <Flex alignItems="center">
                <Badge
                  bg={gradeBadgeColors[currentEvent.target] || 'gray.500'}
                  color="white"
                  fontSize="lg"
                  fontWeight="bold"
                  px={3}
                  mr={3} /* マージンを縮小 */
                  borderRadius="full"
                >
                  {currentEvent.target}
                </Badge>
                <Text fontSize="xl" fontWeight="bold" noOfLines={1} maxW="150px" mr={10}> {/* 幅を制限 */}
                  {currentEvent.name}
                  {events === sampleEvents && <span style={{ fontSize: '0.7em', color: '#FF6B6B', marginLeft: '0.2em' }}>(サンプル)</span>}
                </Text>
              </Flex>
            </Box>
          </Flex>

          {/* 日数 - さらにコンパクトに */}
          <Box overflow="hidden" position="relative" maxWidth="260px" flexShrink={0} ml={1} mb={1}> {/* 幅を広げる */}
            <Text 
              fontSize="lg"
              fontWeight="extrabold"
              animation={isAnimating ? `${fadeOut} 0.5s forwards` : `${fadeIn} 0.5s`}
              lineHeight="1"
              textAlign="right"
            >
              残り<span style={{ 
                fontSize: '2.0em', 
                color: '#FF0000',
                fontWeight: 'bold', 
                marginLeft: '0.1em', 
                marginRight: '0.1em',
                verticalAlign: '-0.1em',
              }}>{currentEvent.daysRemaining}</span>
              日
              <span style={{ 
                fontSize: '0.7em',
                color: '#FFF',
                fontWeight: 'normal', 
                marginLeft: '2em',
              }}>
                {currentEvent.date.getFullYear()}年{currentEvent.date.getMonth() + 1}月{currentEvent.date.getDate()}日
              </span>
            </Text>
          </Box>
        </Flex>
        
        {/* 時間設定アイコン */}
        <Tooltip label="時間設定">
          <IconButton
            aria-label="時間設定"
            icon={<TimeIcon />}
            colorScheme="blue"
            variant="ghost"
            fontSize="2xl"
            p={0}
            size="3xl"
            color="white"
            mr={10}
            _hover={{ bg: "rgba(255,255,255,0.2)" }}
            onClick={(e) => {
              e.stopPropagation();
              if (onTimeSettingClick) onTimeSettingClick();
            }}
          />
        </Tooltip>
      </Flex>
    </Box>
  );
};

export default CountdownPanel;
