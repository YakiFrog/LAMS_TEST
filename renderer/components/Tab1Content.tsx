import React, { useState, useEffect } from 'react';
import { Box, Heading, Text, Divider } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import SampleStudentList from './SampleStudentList';

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

  return (
    <Box p={6}>
      {/* Clock component */}
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
      >
        <Text fontSize="3xl" fontWeight="bold" color="white" userSelect="none">
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
      </Box>

      {/* Student sections */}
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