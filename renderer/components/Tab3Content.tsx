import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Input,
  Button,
  Text,
  useToast,
  List,
  ListItem,
  IconButton,
  Select,
  Heading,
  Divider,
} from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface Student {
  id: string;
  name: string;
  grade: '教員' | 'M2' | 'M1' | 'B4';
}

const Tab3Content: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<'教員' | 'M2' | 'M1' | 'B4'>('B4');
  const toast = useToast();

  // 初期読み込み時にローカルストレージから学生データを取得
  useEffect(() => {
    const storedStudents = localStorage.getItem('students');
    if (storedStudents) {
      setStudents(JSON.parse(storedStudents));
    }
  }, []);

  // 学生を追加する関数
  const handleAddStudent = () => {
    if (!newStudentName.trim()) {
      toast({
        title: "エラー",
        description: "学生名を入力してください",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const newStudent: Student = {
      id: Date.now().toString(),
      name: newStudentName.trim(),
      grade: selectedGrade,
    };

    const updatedStudents = [...students, newStudent];
    setStudents(updatedStudents);
    localStorage.setItem('students', JSON.stringify(updatedStudents));
    setNewStudentName('');

    toast({
      title: "追加完了",
      description: `${selectedGrade} ${newStudent.name}を追加しました`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  // 学生を削除する関数
  const handleDeleteStudent = (studentId: string) => {
    const updatedStudents = students.filter(student => student.id !== studentId);
    setStudents(updatedStudents);
    localStorage.setItem('students', JSON.stringify(updatedStudents));

    // 関連する出勤データも削除
    const attendanceStates = JSON.parse(localStorage.getItem('attendanceStates') || '{}');
    delete attendanceStates[studentId];
    localStorage.setItem('attendanceStates', JSON.stringify(attendanceStates));

    toast({
      title: "削除完了",
      description: "学生を削除しました",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  // 並び替えハンドラー
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    // 同じ位置にドロップした場合は何もしない
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const allStudents = [...students];
    const draggedStudent = { ...allStudents[getAbsoluteIndex(source)] };
    
    // 移動先のグレードを更新
    draggedStudent.grade = destination.droppableId as Student['grade'];
    
    // 古い位置から削除
    allStudents.splice(getAbsoluteIndex(source), 1);
    
    // 新しい位置に挿入
    allStudents.splice(getAbsoluteIndex(destination), 0, draggedStudent);

    setStudents(allStudents);
    localStorage.setItem('students', JSON.stringify(allStudents));
  };

  // 相対インデックスから絶対インデックスを計算する関数
  const getAbsoluteIndex = (position: { droppableId: string; index: number }) => {
    const { droppableId, index } = position;
    let absoluteIndex = 0;
    
    for (const [grade, gradeStudents] of Object.entries(studentsByGrade)) {
      if (grade === droppableId) {
        return absoluteIndex + index;
      }
      absoluteIndex += gradeStudents.length;
    }
    
    return absoluteIndex;
  };

  // グレードごとに学生をグループ化
  const studentsByGrade = {
    '教員': students.filter(s => s.grade === '教員'),
    'M2': students.filter(s => s.grade === 'M2'),
    'M1': students.filter(s => s.grade === 'M1'),
    'B4': students.filter(s => s.grade === 'B4'),
  };

  return (
    <Box p={5} height="100vh" display="flex" flexDirection="column">
      {/* 入力フォーム部分は固定表示 */}
      <Box 
        position="sticky" 
        top={0} 
        bg="white" 
        zIndex={1} 
        pb={4}
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <HStack>
          <Select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value as Student['grade'])}
            size="lg"
            width="150px"
          >
            <option value="教員">教員</option>
            <option value="M2">M2</option>
            <option value="M1">M1</option>
            <option value="B4">B4</option>
          </Select>
          <Input
            placeholder="学生名を入力"
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            size="lg"
          />
          <Button
            colorScheme="green"
            onClick={handleAddStudent}
            size="lg"
          >
            追加
          </Button>
        </HStack>
      </Box>

      {/* スクロール可能な全体コンテナ */}
      <Box
        flex="1"
        overflowY="auto"
        mt={4}
        css={{
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#888',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#555',
          },
        }}
      >
        <DragDropContext onDragEnd={handleDragEnd}>
          {Object.entries(studentsByGrade).map(([grade, gradeStudents]) => (
            <Box 
              key={grade} 
              mb={6}
              borderWidth="1px"
              borderRadius="lg"
              p={4}
              bg="white"
            >
              <Heading 
                size="md" 
                mb={2}
                bg="white"
                py={2}
              >
                {grade}
              </Heading>
              <Divider mb={3} />
              <Droppable droppableId={grade}>
                {(provided, snapshot) => (
                  <List
                    spacing={3}
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    minHeight="50px"
                    bg={snapshot.isDraggingOver ? "gray.50" : "transparent"}
                    borderRadius="md"
                    p={2}
                  >
                    {gradeStudents.map((student, index) => (
                      <Draggable
                        key={student.id}
                        draggableId={student.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <ListItem
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            p={3}
                            borderWidth="1px"
                            borderRadius="lg"
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            bg={snapshot.isDragging ? "blue.50" : "white"}
                            boxShadow={snapshot.isDragging ? "lg" : "sm"}
                            transform={snapshot.isDragging ? "scale(1.02)" : "none"}
                            transition="all 0.2s"
                            _hover={{ bg: "gray.50" }}
                            cursor="grab"
                          >
                            <Text fontSize="lg">{student.name}</Text>
                            <IconButton
                              aria-label="Delete student"
                              icon={<DeleteIcon />}
                              colorScheme="red"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStudent(student.id);
                              }}
                              size="sm"
                            />
                          </ListItem>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </List>
                )}
              </Droppable>
            </Box>
          ))}
        </DragDropContext>
      </Box>
    </Box>
  );
};

export default Tab3Content;