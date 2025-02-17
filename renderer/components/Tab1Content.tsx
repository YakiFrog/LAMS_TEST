import React from 'react';
import { Box, Heading, Text, Divider } from '@chakra-ui/react';
import SampleStudentList from './SampleStudentList';

const Tab1Content: React.FC = () => {
  // サンプル学生情報を定義（MainTabを参考に追加）
  const sampleStudents = {
    教員: [{ id: 'sample-teacher', name: '井上 雄紀' }],
    M2: [{ id: 'sample-M2', name: 'サンプル学生 M2' }],
    M1: [{ id: 'sample-M1', name: 'サンプル学生 M1' }],
    B4: [{ id: 'sample-B4', name: 'サンプル学生 B4' }],
  };

  return (
    <Box p={4}>
      {/* 教員セクション */}
      <Box mb={6}>
        <Heading as="h2" size="lg">教員</Heading>
        <Divider my={2} />
        <SampleStudentList students={sampleStudents.教員} />
      </Box>
      {/* M2セクション */}
      <Box mb={6}>
        <Heading as="h2" size="lg">M2</Heading>
        <Divider my={2} />
        <SampleStudentList students={sampleStudents.M2} />
      </Box>
      {/* M1セクション */}
      <Box mb={6}>
        <Heading as="h2" size="lg">M1</Heading>
        <Divider my={2} />
        <SampleStudentList students={sampleStudents.M1} />
      </Box>
      {/* B4セクション */}
      <Box mb={6}>
        <Heading as="h2" size="lg">B4</Heading>
        <Divider my={2} />
        <SampleStudentList students={sampleStudents.B4} />
      </Box>
      {/* ダミーコンテンツ */}
      {Array.from({ length: 20 }, (_, i) => (
        <Text key={i}>ダミーテキスト {i + 1}</Text>
      ))}
    </Box>
  );
};

export default Tab1Content;