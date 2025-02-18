import React, { useState, useEffect } from 'react';
import { Box, Heading, Text, Divider } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import SampleStudentList from './SampleStudentList';
import { WiDaySunny, WiCloudy, WiRain, WiThunderstorm, WiSnow } from 'react-icons/wi';

interface Student {
  id: string;
  name: string;
  grade: '教員' | 'M2' | 'M1' | 'B4';
}

const bounce = keyframes`
  0% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-15px); }
  100% { transform: translateX(-50%) translateY(0); }
`;

const Tab1Content: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [isBouncing, setIsBouncing] = useState(false);
  const [weatherIcon, setWeatherIcon] = useState<React.ReactNode | null>(null);

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update the time every second
  useEffect(() => {
    if (!isMounted) return;
    
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(intervalId);
  }, [isMounted]);

  // Load students from localStorage
  useEffect(() => {
    const storedStudents = localStorage.getItem('students');
    if (storedStudents) {
      setStudents(JSON.parse(storedStudents));
    }
  }, []);

  // Group students by grade
  const studentsByGrade = {
    教員: students.filter(s => s.grade === '教員'),
    M2: students.filter(s => s.grade === 'M2'),
    M1: students.filter(s => s.grade === 'M1'),
    B4: students.filter(s => s.grade === 'B4'),
  };

  const handleClockClick = () => {
    setIsBouncing(true);
    window.location.reload();

    // Reset bouncing state after a short delay
    setTimeout(() => {
      setIsBouncing(false);
    }, 200); // Adjust the duration as needed
  };

  const getWeatherIcon = async () => {
    try {
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

      const apiKey = 'b3c349ce219ca5db2d21213b3e403879';
      const city = 'Osaka';
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
      const response = await fetch(url);
      const data = await response.json();
      const weather = data.weather[0].main;

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

      localStorage.setItem('weatherType', weather);
      localStorage.setItem('weatherTimestamp', Date.now().toString());

    } catch (error) {
      console.error("Failed to fetch weather data", error);
      setWeatherIcon(null);
    }
  };

  useEffect(() => {
    getWeatherIcon();
    const intervalId = setInterval(getWeatherIcon, 30 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <Box p={6}>
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

      <Box
        position="absolute"
        top="8vh"
        left="50%"
        transform="translateX(-50%)"
        zIndex={1000}
        bg="black"
        py={3}
        px={10}
        borderRadius="full"
        boxShadow="lg"
        onClick={handleClockClick}
        cursor="pointer"
        transition="transform 0.1s ease-in-out"
        animation={isBouncing ? `${bounce} 0.1s ease-out` : 'none'}
        transformOrigin="bottom"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize="3xl" fontWeight="bold" color="white" userSelect="none" mr={2}>
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
            style={{ filter: 'url(#outline)' }}
          >
            {weatherIcon}
          </Box>
        )}
      </Box>

      {Object.entries(studentsByGrade).map(([grade, gradeStudents]) => (
        <Box key={grade} mb={8} userSelect="none">
          <Heading as="h2" size="xl" color="gray.700">{grade}</Heading>
          <Divider my={3} borderColor="gray.300" />
          <SampleStudentList students={gradeStudents} />
        </Box>
      ))}
    </Box>
  );
};

export default Tab1Content;