import React, { useState, useEffect } from 'react';
import { Box, Text, Flex, Badge } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { loadCountdownEventsFromCSV, CountdownEvent } from '../utils/countdownManager';
import { getCurrentTime } from '../utils/timeManager';

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
}

const CountdownPanel: React.FC<CountdownPanelProps> = ({ transitionInterval = 15000 }) => {
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

  // 読み込み中の状態表示
  if (isLoading) {
    return (
      <Box
        p={2} 
        borderRadius="2xl"
        bg="#131113"
        color="white"
        minWidth="15vw"
        maxWidth="200px"
        textAlign="center"
      >
        <Text fontSize="sm">カウントダウン情報を読み込み中...</Text>
      </Box>
    );
  }

  // イベントが設定されている場合（サンプルデータを含む）
  const currentEvent = events[currentEventIndex];

return (
    <Box
        p={4}
        borderRadius="full"
        bg="#131113"
        color="white"
        boxShadow="0 2px 5px rgba(0, 0, 0, 0.8)"
        width="auto"
        minWidth="300px"
        textAlign="center"
        position="relative"
        left="-45%"
        mt={4}
    >
        <Flex align="center" justify="space-between" width="100%">
            {/* 対象学年バッジとイベント名 */}
            <Flex align="center" ml={3} mr={8} overflow="hidden" position="relative" minWidth="120px">
                <Box
                    animation={isAnimating ? `${fadeOut} 0.5s forwards` : `${fadeIn} 0.5s`}
                >
                    <Flex alignItems="center">
                        <Badge
                            bg={gradeBadgeColors[currentEvent.target] || 'gray.500'}
                            color="white"
                            fontSize="medium"
                            fontWeight="bold"
                            px={2.0}
                            mr={3.0}
                            borderRadius="full"
                        >
                            {currentEvent.target}
                        </Badge>
                        <Text fontSize="medium" fontWeight="bold">
                            {currentEvent.name}
                            {events === sampleEvents && <span style={{ fontSize: '0.7em', color: '#FF6B6B', marginLeft: '0.3em' }}>(サンプル)</span>}
                        </Text>
                    </Flex>
                </Box>
            </Flex>

            {/* 日数 */}
            <Box overflow="hidden" position="relative" minWidth="100px" mt={-1}>
                <Text 
                    fontSize="xl"
                    fontWeight="extrabold"
                    animation={isAnimating ? `${fadeOut} 0.5s forwards` : `${fadeIn} 0.5s`}
                    lineHeight="1"
                    my={0}
                >残り
                    <span style={{ 
                        fontSize: '1.7em', 
                        color: '#FF0000',
                        fontWeight: 'bold', 
                        marginLeft: '0.2em', 
                        marginRight: '0.2em',
                        letterSpacing: '0.01em',
                        verticalAlign: '-0.1em', // Changed from 'middle' to '-0.1em' to move it up
                    }}>{currentEvent.daysRemaining}</span>日
                </Text>
            </Box>

            {/* 日付 */}
            <Box overflow="hidden" position="relative" minWidth="80px">
                <Text 
                    fontSize="xs"
                    color="gray.300"
                    animation={isAnimating ? `${fadeOut} 0.5s forwards` : `${fadeIn} 0.5s`}
                >
                    {currentEvent.date.toLocaleDateString()}
                </Text>
            </Box>
        </Flex>
    </Box>
);
};

export default CountdownPanel;
