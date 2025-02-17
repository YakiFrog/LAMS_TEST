import React, { useState } from 'react';
import { Box, Wrap, WrapItem, Text } from '@chakra-ui/react';
import StudentModal from './StudentModal';

interface Student {
  id: string;
  name: string;
}

interface Props {
  students: Student[];
}

const SampleStudentList: React.FC<Props> = ({ students }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const onClose = () => setIsOpen(false);

  // 選択された学生情報を取得   
  const onOpen = (student: Student) => {
    setSelectedStudent(student);
    setIsOpen(true);
  };

  return (
    <>
      <Wrap spacing={2} mt={2}>
        {students.map(student => (
          <WrapItem key={student.id}>
            <Box
              borderWidth="2px"
              borderRadius="xl"
              p={2}
              pl={4}
              pr={4}
              cursor="pointer"
              onClick={() => onOpen(student)}
            >
              <Text fontSize="xl" color="gray.700" fontWeight="light">
                {student.name}
              </Text>
            </Box>
          </WrapItem>
        ))}
      </Wrap>

      {/* StudentModal を追加 */}
      <StudentModal isOpen={isOpen} onClose={onClose} student={selectedStudent} /> 
    </>
  );
};

export default SampleStudentList;
