import React, { useState, useEffect } from 'react';
import { Box, Heading, Text, Divider } from '@chakra-ui/react';
import SampleStudentList from './SampleStudentList';

interface Student {
  id: string;
  name: string;
  grade: '教員' | 'M2' | 'M1' | 'B4';
}

const Tab1Content: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);

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

  return (
    <Box p={6}>
      {/* Clock component */}
      <Box
        position="absolute"
        top="8vh"
        left="50%"
        transform="translateX(-50%)"
        zIndex={1000}
        bg="white"
        p={3}
        borderRadius="md"
        boxShadow="md"
      >
        <Text fontSize="3xl" fontWeight="bold" color="gray.700">
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
        <Box key={grade} mb={8}>
          <Heading as="h2" size="xl" color="gray.700">{grade}</Heading>
          <Divider my={3} borderColor="gray.300" />
          <SampleStudentList students={gradeStudents} />
        </Box>
      ))}
    </Box>
  );
};

export default Tab1Content;