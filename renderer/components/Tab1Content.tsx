import React from 'react';
import { Box, Heading, Text, Divider } from '@chakra-ui/react';
import SampleStudentList from './SampleStudentList';

const Tab1Content: React.FC = () => {
  // サンプル学生情報を定義（MainTabを参考に追加）
  const sampleStudents = {
    教員: [{ id: 'sample-teacher', name: '井上 雄紀' }],
    M2: Array.from({ length: 6 }, (_, i) => ({ id: `sample-M2-${i + 1}`, name: `サンプル学生 M2-${i + 1}` })),
    M1: Array.from({ length: 6 }, (_, i) => ({ id: `sample-M1-${i + 1}`, name: `サンプル学生 M1-${i + 1}` })),
    B4: Array.from({ length: 10 }, (_, i) => ({ id: `sample-B4-${i + 1}`, name: `サンプル学生 B4-${i + 1}` })),
  };

  return (
    <Box p={6}>
      {/* 教員セクション */}
      <Box mb={8}>
        <Heading as="h2" size="xl" color="gray.700">教員</Heading>
        <Divider my={3} borderColor="gray.300" />
        <SampleStudentList students={sampleStudents.教員} />
      </Box>
      {/* M2セクション */}
      <Box mb={8}>
        <Heading as="h2" size="xl" color="gray.700">M2</Heading>
        <Divider my={3} borderColor="gray.300" />
        <SampleStudentList students={sampleStudents.M2} />
      </Box>
      {/* M1セクション */}
      <Box mb={8}>
        <Heading as="h2" size="xl" color="gray.700">M1</Heading>
        <Divider my={3} borderColor="gray.300" />
        <SampleStudentList students={sampleStudents.M1} />
      </Box>
      {/* B4セクション */}
      <Box mb={8}>
        <Heading as="h2" size="xl" color="gray.700">B4</Heading>
        <Divider my={3} borderColor="gray.300" />
        <SampleStudentList students={sampleStudents.B4} />
      </Box>
    </Box>
  );
};

export default Tab1Content;