import React, { useState, useEffect } from 'react';
import { Box, Wrap, WrapItem, Text, Badge } from '@chakra-ui/react';
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
  const [attendanceStates, setAttendanceStates] = useState<{
    [studentId: string]: {
      isAttending: boolean;
      attendanceTime: Date | null;
      leavingTime: Date | null;
    };
  }>({});

  useEffect(() => {
    // ローカルストレージから出勤状況を読み込む
    const storedAttendanceStates = localStorage.getItem('attendanceStates');
    if (storedAttendanceStates) {
      const parsedAttendanceStates = JSON.parse(storedAttendanceStates);

      // 今日の日付を取得
      const today = new Date();
      console.log(today);
      today.setHours(0, 0, 0, 0);

      // 出勤状況を検証し、今日の日付と異なる場合はリセット
      Object.keys(parsedAttendanceStates).forEach(studentId => {
        const attendanceState = parsedAttendanceStates[studentId];
        if (attendanceState) {
          if (attendanceState.attendanceTime) {
            const attendanceDate = new Date(attendanceState.attendanceTime);
            attendanceDate.setHours(0, 0, 0, 0);
            if (attendanceDate.getTime() !== today.getTime()) {
              delete parsedAttendanceStates[studentId];
              return;
            }
            attendanceState.attendanceTime = new Date(attendanceState.attendanceTime);
          }

          if (attendanceState.leavingTime) {
            const leavingDate = new Date(attendanceState.leavingTime);
            leavingDate.setHours(0, 0, 0, 0);
            if (leavingDate.getTime() !== today.getTime()) {
              delete parsedAttendanceStates[studentId];
              return;
            }
            attendanceState.leavingTime = new Date(attendanceState.leavingTime);
          }
        }
      });

      setAttendanceStates(parsedAttendanceStates);
    }
  }, []);

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
              py={3}
              px={6}
              mb={0}
              cursor="pointer"
              onClick={() => onOpen(student)}
              position="relative"
              borderColor={
                attendanceStates[student.id]?.isAttending
                  ? "green.400"
                  : attendanceStates[student.id]?.leavingTime
                  ? "red.400"
                  : "gray.200"
              }
            >
              <Text fontSize="2xl" color="gray.700" fontWeight="light">
                {student.name}
              </Text>
              {/* ラベル */}
                {attendanceStates[student.id]?.isAttending && (
                <Badge
                  colorScheme="green"
                  position="absolute"
                  bottom="-2"
                  right="-2"
                  fontSize="md"
                  zIndex={2}
                  borderRadius="full"
                  px={2}
                >
                  出勤中
                </Badge>
                )}
                {attendanceStates[student.id]?.leavingTime && !attendanceStates[student.id]?.isAttending && (
                <Badge
                  colorScheme="red"
                  position="absolute"
                  bottom="-2"
                  right="-2"
                  fontSize="md"
                  zIndex={2}
                  borderRadius="full"
                  px={2}
                >
                  退勤済
                </Badge>
                )}
            </Box>
          </WrapItem>
        ))}
      </Wrap>

      <StudentModal 
        isOpen={isOpen} 
        onClose={onClose} 
        student={selectedStudent} 
        attendanceStates={attendanceStates}
        setAttendanceStates={setAttendanceStates}
      />
    </>
  );
};

export default SampleStudentList;
