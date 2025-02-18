import React, { useState, useEffect, useCallback } from 'react';
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
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import Papa from 'papaparse';

interface Student {
  id: string;
  name: string;
  grade: '教員' | 'M2' | 'M1' | 'B4';
}

// 確認モーダルコンポーネント
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  cancelRef: React.RefObject<HTMLButtonElement>;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  body,
  cancelRef,
}) => (
  <AlertDialog
    isOpen={isOpen}
    leastDestructiveRef={cancelRef}
    onClose={onClose}
    isCentered // この行を追加
  >
    <AlertDialogOverlay>
      <AlertDialogContent>
        <AlertDialogHeader fontSize="lg" fontWeight="bold">
          {title}
        </AlertDialogHeader>
        <AlertDialogBody>{body}</AlertDialogBody>
        <AlertDialogFooter>
          <Button ref={cancelRef} onClick={onClose}>
            キャンセル
          </Button>
          <Button colorScheme="red" onClick={onConfirm} ml={3}>
            削除
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialogOverlay>
  </AlertDialog>
);

const Tab3Content: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<'教員' | 'M2' | 'M1' | 'B4'>('B4');
  const toast = useToast();

  // CSVファイル読み込み用のstate
  const [csvFile, setCsvFile] = useState<File | null>(null);
  // 既存の学生データをクリアするかどうかのstate
  const [clearExistingData, setClearExistingData] = useState(false);

  // モーダルの状態を管理するstate
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [isAttendanceDeleteDialogOpen, setIsAttendanceDeleteDialogOpen] = useState(false);
  const [deletingAttendanceStudentId, setDeletingAttendanceStudentId] = useState<string | null>(null);
  const [isClearAllAttendanceDeleteDialogOpen, setIsClearAllAttendanceDeleteDialogOpen] = useState(false);
    // 全ての学生を削除する確認モーダルの状態
  const [isClearAllStudentsDeleteDialogOpen, setIsClearAllStudentsDeleteDialogOpen] = useState(false);
  const cancelRef = React.useRef(null);

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
  const handleDeleteStudent = useCallback((studentId: string) => {
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
  }, [students, toast]);

  // 全ての学生を削除する関数
  const clearAllStudents = useCallback(() => {
    setStudents([]);
    localStorage.removeItem('students');
    localStorage.removeItem('attendanceStates');

    toast({
      title: "削除完了",
      description: "全ての学生を削除しました",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  }, [toast]);

  // 全ての学生の出勤データを削除する関数
  const clearAllAttendanceData = useCallback(() => {
    localStorage.removeItem('attendanceStates');
    toast({
      title: "削除完了",
      description: "全ての学生の出勤データを削除しました",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  }, [toast]);

  // 選択した学生の出勤データを削除する関数
  const clearAttendanceData = useCallback((studentId: string) => {
    const attendanceStates = JSON.parse(localStorage.getItem('attendanceStates') || '{}');
    delete attendanceStates[studentId];
    localStorage.setItem('attendanceStates', JSON.stringify(attendanceStates));

    toast({
      title: "削除完了",
      description: "選択した学生の出勤データを削除しました",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  }, [toast]);

  // 削除確認モーダルを開く関数
  const openDeleteConfirmation = useCallback((studentId: string | null) => {
    setDeletingStudentId(studentId);
    setIsDeleteDialogOpen(true);
  }, []);

  // 出勤データ削除確認モーダルを開く関数
  const openAttendanceDeleteConfirmation = useCallback((studentId: string | null) => {
    setDeletingAttendanceStudentId(studentId);
    setIsAttendanceDeleteDialogOpen(true);
  }, []);

  // 全ての出勤データ削除確認モーダルを開く関数
  const openClearAllAttendanceDeleteConfirmation = useCallback(() => {
    setIsClearAllAttendanceDeleteDialogOpen(true);
  }, []);

    // 全ての学生を削除する確認モーダルを開く関数
    const openClearAllStudentsDeleteConfirmation = useCallback(() => {
      setIsClearAllStudentsDeleteDialogOpen(true);
    }, []);

  // 削除確認モーダルを閉じる関数
  const closeDeleteConfirmation = useCallback(() => {
    setIsDeleteDialogOpen(false);
    setDeletingStudentId(null);
  }, []);

  // 出勤データ削除確認モーダルを閉じる関数
  const closeAttendanceDeleteConfirmation = useCallback(() => {
    setIsAttendanceDeleteDialogOpen(false);
    setDeletingAttendanceStudentId(null);
  }, []);

  // 全ての出勤データ削除確認モーダルを閉じる関数
  const closeClearAllAttendanceDeleteConfirmation = useCallback(() => {
    setIsClearAllAttendanceDeleteDialogOpen(false);
  }, []);

    // 全ての学生を削除する確認モーダルを閉じる関数
    const closeClearAllStudentsDeleteConfirmation = useCallback(() => {
      setIsClearAllStudentsDeleteDialogOpen(false);
    }, []);

  // 削除を実行する関数
  const confirmDelete = useCallback(() => {
    if (deletingStudentId) {
      handleDeleteStudent(deletingStudentId);
    }
    closeDeleteConfirmation();
  }, [deletingStudentId, handleDeleteStudent, closeDeleteConfirmation]);

  // 出勤データ削除を実行する関数
  const confirmAttendanceDelete = useCallback(() => {
    if (deletingAttendanceStudentId) {
      clearAttendanceData(deletingAttendanceStudentId);
    }
    closeAttendanceDeleteConfirmation();
  }, [deletingAttendanceStudentId, clearAttendanceData, closeAttendanceDeleteConfirmation]);

  // 全ての出勤データ削除を実行する関数
  const confirmClearAllAttendanceDelete = useCallback(() => {
    clearAllAttendanceData();
    closeClearAllAttendanceDeleteConfirmation();
  }, [clearAllAttendanceData, closeClearAllAttendanceDeleteConfirmation]);

    // 全ての学生を削除する関数
    const confirmClearAllStudentsDelete = useCallback(() => {
      clearAllStudents();
      closeClearAllStudentsDeleteConfirmation();
    }, [clearAllStudents, closeClearAllStudentsDeleteConfirmation]);

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

  // CSVファイルが選択されたときの処理
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
    }
  };

  // CSVファイルを読み込んで学生データを追加する関数
  const handleImportStudents = useCallback(() => {
    if (!csvFile) {
      toast({
        title: "エラー",
        description: "CSVファイルを選択してください",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    Papa.parse(csvFile, {
      header: true,
      complete: (results) => {
        let parsedStudents = results.data as any[];

        // ヘッダー行を削除
        if (parsedStudents.length > 0 && parsedStudents[0].__parsed_extra) {
          parsedStudents = parsedStudents.slice(1);
        }

        const newStudents: Student[] = parsedStudents.map(row => {
          // rowがundefinedまたはnullの場合の安全なチェック
          const id = row?.id || Date.now().toString();
          const name = row?.name || '名前なし';
          const grade = row?.grade || 'B4';
          return {
            id: String(id), // IDを文字列に変換
            name: String(name), // 名前を文字列に変換
            grade: grade as '教員' | 'M2' | 'M1' | 'B4', // gradeを型アサーション
          };
        });

        // 既存の学生データをクリアする場合
        let updatedStudents = [...students];
        if (clearExistingData) {
          updatedStudents = [...newStudents]; // 新しい学生データで上書き
        } else {
          updatedStudents = [...students, ...newStudents]; // 新しい学生データを追加
        }

        setStudents(updatedStudents);
        localStorage.setItem('students', JSON.stringify(updatedStudents));

        toast({
          title: "インポート完了",
          description: `${newStudents.length}件の学生データをインポートしました`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        setCsvFile(null); // ファイル選択をリセット
        setClearExistingData(false); // チェックボックスの状態をリセット
      },
      error: (error) => {
        toast({
          title: "CSVパースエラー",
          description: error.message,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    });
  }, [csvFile, setStudents, toast, clearExistingData, students]);

  // 学生データをCSV形式でエクスポートする関数
  const handleExportStudents = () => {
    const csvData = Papa.unparse({
      fields: ["id", "name", "grade"],
      data: students
    });

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "students.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "エクスポート完了",
      description: "学生データをCSVファイルにエクスポートしました",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
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
        <HStack mt={2} align="center">
          <Input
            type="file"
            accept=".csv"
            onChange={handleCsvFileChange}
            id="csv-upload"
            style={{ display: 'none' }}
          />
          <Button
            as="label"
            htmlFor="csv-upload"
            colorScheme="blue"
            size="md"
          >
            CSVファイルを読み込む
          </Button>
          <Button
            colorScheme="teal"
            onClick={handleImportStudents}
            size="md"
            isDisabled={!csvFile}
          >
            学生データをインポート
          </Button>
          <Button
            colorScheme="orange"
            onClick={handleExportStudents}
            size="md"
          >
            学生データをエクスポート
          </Button>
        </HStack>
        <HStack mt={2}>
          <Button
            colorScheme="red"
            onClick={openClearAllAttendanceDeleteConfirmation}
            size="md"
          >
            全ての出勤データを削除
          </Button>
          <Button
            colorScheme="red"
            onClick={openClearAllStudentsDeleteConfirmation}
            size="md"
          >
            全ての学生を削除
          </Button>
        </HStack>
      </Box>

      {/* 削除確認モーダル */}
      <ConfirmationModal
        isOpen={isDeleteDialogOpen}
        onClose={closeDeleteConfirmation}
        onConfirm={confirmDelete}
        title="学生の削除"
        body="本当にこの学生を削除しますか？"
        cancelRef={cancelRef}
      />

      {/* 出勤データ削除確認モーダル */}
      <ConfirmationModal
        isOpen={isAttendanceDeleteDialogOpen}
        onClose={closeAttendanceDeleteConfirmation}
        onConfirm={confirmAttendanceDelete}
        title="出勤データの削除"
        body="本当にこの学生の出勤データを削除しますか？"
        cancelRef={cancelRef}
      />

      {/* 全ての出勤データ削除確認モーダル */}
      <ConfirmationModal
        isOpen={isClearAllAttendanceDeleteDialogOpen}
        onClose={closeClearAllAttendanceDeleteConfirmation}
        onConfirm={confirmClearAllAttendanceDelete}
        title="全ての出勤データの削除"
        body="本当に全ての学生の出勤データを削除しますか？"
        cancelRef={cancelRef}
      />

        {/* 全ての学生を削除する確認モーダル */}
        <ConfirmationModal
          isOpen={isClearAllStudentsDeleteDialogOpen}
          onClose={closeClearAllStudentsDeleteConfirmation}
          onConfirm={confirmClearAllStudentsDelete}
          title="全ての学生の削除"
          body="本当に全ての学生を削除しますか？"
          cancelRef={cancelRef}
        />

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
                            transition="all 0.2s"
                            _hover={{ bg: "gray.50" }}
                            cursor="grab"
                          >
                            <Text fontSize="lg">{student.name}</Text>
                            <HStack>
                              <IconButton
                                aria-label="Clear attendance"
                                icon={<DeleteIcon />}
                                colorScheme="yellow"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAttendanceDeleteConfirmation(student.id);
                                }}
                                size="sm"
                              />
                              <IconButton
                                aria-label="Delete student"
                                icon={<DeleteIcon />}
                                colorScheme="red"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteConfirmation(student.id);
                                }}
                                size="sm"
                              />
                            </HStack>
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