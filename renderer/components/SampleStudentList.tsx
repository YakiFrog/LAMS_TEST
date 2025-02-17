import React from 'react';
import { Box, Wrap, WrapItem, Text } from '@chakra-ui/react';

interface Student {
  id: string;
  name: string;
}

interface Props {
  students: Student[];
}

const SampleStudentList: React.FC<Props> = ({ students }) => {
  return (
    <Wrap spacing={2} mt={2}>
      {students.map(student => (
        <WrapItem key={student.id}>
          <Box borderWidth="2px" borderRadius="xl" p={2} pl={4} pr={4}>
            <Text>{student.name}</Text>
          </Box>
        </WrapItem>
      ))}
    </Wrap>
  );
};

export default SampleStudentList;
