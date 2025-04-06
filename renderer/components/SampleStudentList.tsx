// このコンポーネントは学生リストの表示と出退勤状況を管理します
import React, { useState, useEffect } from 'react';
import { Box, Wrap, WrapItem, Text, Badge, useToast, Flex } from '@chakra-ui/react';
import StudentModal from './StudentModal';
import { exportAttendanceToCSV } from '../utils/exportAttendance';
import { getCurrentTime, resetTime, formatStayTime } from '../utils/timeManager';
import { getYearlyAttendanceDays } from '../utils/attendanceAnalyzer';
import { keyframes } from '@emotion/react';

// ラベル切り替えアニメーションの定義
const fadeInOut = keyframes`
  0%, 45% { opacity: 1; transform: translateY(0); }
  50%, 95% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
`;

const fadeOutIn = keyframes`
  0%, 45% { opacity: 0; transform: translateY(10px); }
  50%, 95% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(10px); }
`;

interface Student {
  id: string;
  name: string;
  grade: '教員' | 'M2' | 'M1' | 'B4';
}

interface Props {
  students: Student[];
}

// 学生パネルサイズを計算するための定数
const MIN_SCALE = 0.9;   // 最小サイズ倍率（より小さく）
const MAX_SCALE = 1.7;   // 最大サイズ倍率（より大きく）
const BASE_WIDTH = 150;  // 基本幅を大きく（120から150に）
const BASE_HEIGHT = 60;  // 基本高さ
const CHAR_WIDTH = 22;   // 1文字あたりの幅（ピクセル）を増加
const MAX_PANELS_PER_ROW = 6; // 1行あたりの最大パネル数（レイアウト調整用）

const SampleStudentList: React.FC<Props> = ({ students }) => {
  // モーダル表示状態と選択された学生の状態管理
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [attendanceStates, setAttendanceStates] = useState<{
    [studentId: string]: {
      isAttending: boolean;
      attendanceTime: Date | null;
      leavingTime: Date | null;
      totalStayTime: number; // 追加: 累積滞在時間
    };
  }>({});
  // 各学生の年間出勤日数を追跡
  const [attendanceDaysMap, setAttendanceDaysMap] = useState<{[studentId: string]: number}>({});
  // 最大出勤日数（スケール計算のため）
  const [maxAttendanceDays, setMaxAttendanceDays] = useState<number>(1);
  const toast = useToast();

  // ReactのuseEffect hookを使用して、クライアントサイドレンダリングを制御する
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 学生の出勤日数を取得する
  useEffect(() => {
    const fetchAttendanceDays = async () => {
      const daysMap: {[studentId: string]: number} = {};
      let maxDays = 1; // 0除算を避けるため最小値を1に設定
      
      // すべての学生の出勤日数を取得
      for (const student of students) {
        try {
          const days = await getYearlyAttendanceDays(student.id);
          daysMap[student.id] = days;
          
          // 最大値を更新
          if (days > maxDays) {
            maxDays = days;
          }
        } catch (error) {
          console.error(`学生ID ${student.id} の出勤日数取得エラー:`, error);
          daysMap[student.id] = 0;
        }
      }
      
      setAttendanceDaysMap(daysMap);
      setMaxAttendanceDays(maxDays);
    };
    
    if (students.length > 0) {
      fetchAttendanceDays();
    }
  }, [students]);

  // 出勤日数に基づいてスケール係数を計算
  const calculateScale = (studentId: string): number => {
    const days = attendanceDaysMap[studentId] || 0;
    
    // 全学生の平均値を計算（過剰なスケーリングを防ぐため）
    const totalStudents = students.length || 1;
    const totalDays = Object.values(attendanceDaysMap).reduce((sum, days) => sum + days, 0);
    const averageDays = totalDays / totalStudents;
    
    // 調整係数（1以上の場合は全体的にスケールを抑制）
    const adjustmentFactor = Math.max(1, averageDays / 15); // 15に変更（メリハリを強調）
    
    // 日数が多いほど大きなスケール値を返す（MIN_SCALEからMAX_SCALEの範囲）
    if (maxAttendanceDays <= 1) return MIN_SCALE;
    
    // スケールを計算するが、調整係数で抑制
    const rawScale = MIN_SCALE + ((MAX_SCALE - MIN_SCALE) * days / maxAttendanceDays);
    // ベースとなるスケール値を少し高めに設定してメリハリを強調
    return MIN_SCALE + ((rawScale - MIN_SCALE) / adjustmentFactor);
  };

  // 出勤状況の読み込み用useEffect
  useEffect(() => {
    const loadAttendanceStates = () => {
      // 出勤状況の初期化処理：ローカルストレージからデータを読み込み、日付が今日でない場合はリセットする
      const storedAttendanceStates = localStorage.getItem('attendanceStates');
      if (storedAttendanceStates) {
        const parsedAttendanceStates = JSON.parse(storedAttendanceStates);

        // 現在の日付を取得（時刻情報をリセット）
        const today = resetTime(getCurrentTime());

        let needsExport = false; // エクスポートが必要かのフラグ
        let expiredStudentIds = []; // 期限切れの学生ID
        
        // 期限切れデータの詳細情報を保持
        const expiredData = {};

        // 1. 期限切れのデータをチェックする（削除はまだしない）
        Object.keys(parsedAttendanceStates).forEach(studentId => {
          const attendanceState = parsedAttendanceStates[studentId];
          if (attendanceState) {
            if (attendanceState.attendanceTime) {
              const attendanceDate = resetTime(new Date(attendanceState.attendanceTime));
              // 日付が違う場合は期限切れとしてマーク
              if (attendanceDate.getTime() !== today.getTime()) {
                needsExport = true;
                if (!expiredStudentIds.includes(studentId)) {
                  expiredStudentIds.push(studentId);
                  // 期限切れデータを保存（元のDate型を維持）
                  expiredData[studentId] = { 
                    ...attendanceState,
                    // 明示的にDateオブジェクトとして保存
                    attendanceTime: new Date(attendanceState.attendanceTime),
                    leavingTime: attendanceState.leavingTime ? new Date(attendanceState.leavingTime) : null
                  };
                  
                  // デバッグログを追加
                  const date = new Date(attendanceState.attendanceTime);
                  console.log(`期限切れデータ詳細 [ID:${studentId}]: ${date.toLocaleString()} (${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日)`);
                }
              }
            }

            if (attendanceState.leavingTime) {
              const leavingDate = resetTime(new Date(attendanceState.leavingTime));
              // 日付が違う場合は期限切れとしてマーク
              if (leavingDate.getTime() !== today.getTime()) {
                needsExport = true;
                if (!expiredStudentIds.includes(studentId)) {
                  expiredStudentIds.push(studentId);
                }
              }
            }

            // totalStayTime が存在しない場合は初期化
            if (attendanceState.totalStayTime === undefined) {
              attendanceState.totalStayTime = 0;
            }
          }
        });

        // 日付変換処理（Date型に変換）
        Object.values(parsedAttendanceStates).forEach(state => {
          const attendanceState = state as {
            isAttending: boolean;
            attendanceTime: Date | null;
            leavingTime: Date | null;
            totalStayTime: number;
          };
          
          if (attendanceState.attendanceTime) {
            attendanceState.attendanceTime = new Date(attendanceState.attendanceTime);
          }
          if (attendanceState.leavingTime) {
            attendanceState.leavingTime = new Date(attendanceState.leavingTime);
          }
        });

        // 2. 必要に応じてエクスポート処理
        if (needsExport && expiredStudentIds.length > 0) {
          console.log('期限切れの出勤データを検出しました。エクスポートします。', expiredStudentIds);
          console.log('現在のstudentsデータ:', students.map(s => ({ id: s.id, name: s.name })));
          
          try {
            const exportPath = localStorage.getItem('exportPath');
            if (exportPath) {
              // 現在の学生データのキャッシュをローカル変数に保存
              const currentStudents = [...students];
              
              // 念のためローカルストレージからも学生データを取得してマージする
              const storedStudents = localStorage.getItem('students');
              let finalStudentsList = currentStudents;
              
              if (storedStudents) {
                try {
                  const parsedStoredStudents = JSON.parse(storedStudents) as Student[];
                  console.log('ローカルストレージから読み込んだ学生数:', parsedStoredStudents.length);
                  
                  // IDの重複を避けるためのマップを作成
                  const studentsMap: Record<string, Student> = {};
                  
                  // 現在のstudentsをマップに追加
                  currentStudents.forEach(student => {
                    studentsMap[student.id] = student;
                  });
                  
                  // ストレージからの学生をマップに追加（重複するIDは上書き）
                  parsedStoredStudents.forEach(student => {
                    if (!studentsMap[student.id]) {
                      studentsMap[student.id] = student;
                    }
                  });
                  
                  // マップから配列に戻す
                  finalStudentsList = Object.values(studentsMap);
                  console.log('マージ後の学生数:', finalStudentsList.length);
                } catch (error) {
                  console.error('ローカルストレージの学生データ解析エラー:', error);
                }
              }

              // expiredDataを直接使用してエクスポート（データをIDベースではなく期限切れデータのみに変更）
              exportAttendanceToCSV(expiredData, finalStudentsList, false)
                .then(result => {
                  if (result.success) {
                    console.log('自動エクスポート成功:', result.message);
                    toast({
                      title: "自動エクスポート成功",
                      description: "日付が変わったため、前日の出勤データを自動エクスポートしました",
                      status: "success",
                      duration: 5000,
                      isClosable: true,
                    });
                    
                    // エクスポート成功後に期限切れデータを削除
                    expiredStudentIds.forEach(id => {
                      delete parsedAttendanceStates[id];
                    });
                    
                    // 更新されたデータをローカルストレージに保存
                    localStorage.setItem('attendanceStates', JSON.stringify(parsedAttendanceStates));
                    
                    // UIの状態を更新
                    setAttendanceStates({ ...parsedAttendanceStates });
                  } else {
                    console.error('自動エクスポート失敗:', result.message);
                    toast({
                      title: "自動エクスポート失敗",
                      description: result.message,
                      status: "error",
                      duration: 5000,
                      isClosable: true,
                    });
                    
                    // エクスポートに失敗しても期限切れデータは削除する
                    expiredStudentIds.forEach(id => {
                      delete parsedAttendanceStates[id];
                    });
                    
                    localStorage.setItem('attendanceStates', JSON.stringify(parsedAttendanceStates));
                    setAttendanceStates({ ...parsedAttendanceStates });
                  }
                })
                .catch(error => {
                  console.error('自動エクスポートエラー:', error);
                  toast({
                    title: "自動エクスポートエラー",
                    description: `${error}`,
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                  });
                  
                  // エラー時にも期限切れデータは削除する
                  expiredStudentIds.forEach(id => {
                    delete parsedAttendanceStates[id];
                  });
                  
                  localStorage.setItem('attendanceStates', JSON.stringify(parsedAttendanceStates));
                  setAttendanceStates({ ...parsedAttendanceStates });
                });
            } else {
              console.warn('エクスポートパスが設定されていないため、自動エクスポートをスキップします');
              
              // エクスポートパスがない場合も期限切れデータは削除
              expiredStudentIds.forEach(id => {
                delete parsedAttendanceStates[id];
              });
              
              localStorage.setItem('attendanceStates', JSON.stringify(parsedAttendanceStates));
              setAttendanceStates({ ...parsedAttendanceStates });
            }
          } catch (error) {
            console.error('自動エクスポート処理中にエラー:', error);
            
            // エラー時にも期限切れデータは削除
            expiredStudentIds.forEach(id => {
              delete parsedAttendanceStates[id];
            });
            
            localStorage.setItem('attendanceStates', JSON.stringify(parsedAttendanceStates));
            setAttendanceStates({ ...parsedAttendanceStates });
          }
        } else {
          // エクスポートが不要な場合は直接状態を更新
          setAttendanceStates({ ...parsedAttendanceStates });
        }
      }
    };
    
    // 初回ロード時に実行
    loadAttendanceStates();
    
    // 日付変更や時間変更の検出のためにインターバルを設定
    const intervalId = setInterval(loadAttendanceStates, 10 * 1000); // 10秒ごとに確認（デバッグ用に短縮）
    
    // クリーンアップ関数：コンポーネントがアンマウントされたときにsetIntervalをクリアする
    return () => clearInterval(intervalId);
  }, [students, toast]);

  // 22:30を超えたときに出勤中の学生を22:30時点で自動退勤に更新するuseEffect
  useEffect(() => {
    const checkLateAttendance = () => {
      const now = getCurrentTime();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // 現在時刻が22:30以降かどうかチェック
      if (hours > 22 || (hours === 22 && minutes >= 30)) {
        // 22:30のDateオブジェクトを作成
        const threshold = new Date(now);
        threshold.setHours(22, 30, 0, 0);
        
        setAttendanceStates(prevStates => {
          const newStates = { ...prevStates };
          let updated = false; // 更新フラグ
          
          Object.keys(newStates).forEach(studentId => {
            const state = newStates[studentId];
            if (state && state.isAttending) {
              const attendanceTime = state.attendanceTime;
              if (attendanceTime) { // 出勤時刻が存在する場合、滞在時間を計算
                const duration = Math.floor((threshold.getTime() - new Date(attendanceTime).getTime()) / 1000);
                state.totalStayTime += duration;
                console.log(`自動退勤: 学生ID ${studentId}, 滞在時間追加: ${duration}秒, 合計: ${state.totalStayTime}秒 (${formatStayTime(state.totalStayTime)})`);
              }
              state.isAttending = false;
              state.leavingTime = threshold; // 22:30時点を退勤時刻とする
              updated = true;
            }
          });
          
          if (updated) { // 更新があった場合のみローカルストレージに保存
            localStorage.setItem('attendanceStates', JSON.stringify(newStates));
            toast({
              title: "自動退勤処理実行",
              description: "22:30を過ぎたため、出勤中の学生を自動的に退勤状態にしました",
              status: "info",
              duration: 5000,
              isClosable: true,
            });
          }
          
          return newStates;
        });
      }
    };
    
    // 初回実行
    checkLateAttendance();
    
    // 1分ごとにチェック
    const intervalId = setInterval(checkLateAttendance, 60 * 1000);
    return () => clearInterval(intervalId);
  }, [toast]);

  const onClose = () => {
    // モーダルを閉じる処理
    setIsOpen(false);
  };

  // 学生がクリックされた場合、選択状態を更新しモーダルを表示する
  const onOpen = (student: Student) => {
    setSelectedStudent(student);
    setIsOpen(true);
  };

  // 出勤日数でソートした学生リストを作成（出勤日数の多い順）
  const sortStudents = () => {
    // 学生を出勤日数でソート
    return [...students].sort((a, b) => {
      const daysA = attendanceDaysMap[a.id] || 0;
      const daysB = attendanceDaysMap[b.id] || 0;
      return daysB - daysA; // 降順（多い順）
    });
  };

  return (
    <>
      <Box width="100%" maxHeight="100%">
        <Wrap spacing={3} justify="center" align="center">
          {/* ソートした学生のリストを使用 */}
          {sortStudents().map(student => {
            // 出勤日数に基づくスケール係数
            const scale = calculateScale(student.id);
            
            // 各学年のパネル数に応じて幅を制限
            const maxPanelWidth = students.length > MAX_PANELS_PER_ROW 
              ? `${100 / MAX_PANELS_PER_ROW - 3}%` // 余白を少し減らす
              : `${BASE_WIDTH * scale}px`;
            
            // スケールに基づいてパネルサイズを計算
            // 名前の長さに比例した幅を確保するために係数を1.2に増加
            const nameWidth = student.name.length * CHAR_WIDTH * scale * 1.2; 
            const paddingHorizontal = 20 * scale; // 余白を増加
            // 最小幅を保証する
            const minNameWidth = 120 * scale;
            const width = `${Math.max(minNameWidth, Math.min(BASE_WIDTH * 1.5 * scale, nameWidth + paddingHorizontal * 2))}px`;
            const height = `${BASE_HEIGHT * scale}px`;
            const fontSize = `${1 * scale}rem`;
            
            // 出勤日数の強調表示（出勤日数が多いほど強調）
            const attendanceDays = attendanceDaysMap[student.id] || 0;
            const isFrequent = attendanceDays > (maxAttendanceDays * 0.7); // 70%以上なら頻繁とみなす
            
            return (
              <WrapItem 
                key={student.id} 
                maxWidth={maxPanelWidth} 
                margin="0.25rem"
                // 出勤日数が多いパネルの順序を後ろに（下段に表示されやすく）
                order={attendanceDays > 0 ? -attendanceDays : 0}
              >
                <Box
                  borderWidth={
                    attendanceStates[student.id]?.isAttending
                      ? "3px"
                      : attendanceStates[student.id]?.leavingTime
                      ? "3px"
                      : isFrequent ? "2px" : "1px" // 頻繁な出勤者は太めの枠線
                  }
                  borderRadius="3xl"
                  py={2}
                  px={`${paddingHorizontal}px`}
                  width={width}
                  height={height}
                  minW={`${minNameWidth}px`} // 最小幅を設定
                  maxW="100%" // 親コンテナ以上にならない
                  cursor="pointer"
                  onClick={() => onOpen(student)}
                  position="relative"
                  borderColor={
                    attendanceStates[student.id]?.isAttending
                      ? "green.400"
                      : attendanceStates[student.id]?.leavingTime
                      ? "red.400"
                      : isFrequent ? "purple.300" : "gray.200" // 頻繁な出勤者は紫色の枠線
                  }
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  boxShadow={
                    attendanceStates[student.id]?.isAttending
                      ? "0 2px 4px rgb(0, 255, 0)"
                      : attendanceStates[student.id]?.leavingTime
                      ? "0 2px 4px rgb(255, 0, 0)"
                      : isFrequent ? "0 3px 5px rgba(128, 90, 213, 0.3)" : "0 2px 2px rgba(0, 0, 0, 0.3)"
                  }
                  transition="all 0.3s ease"
                  _hover={{
                    transform: "translateY(-3px)",
                    boxShadow: "0 3px 8px rgba(0, 0, 0, 0.2)"
                  }}
                  overflow="visible" // 内容がはみ出ても表示できるように
                >
                  {/* 出勤日数表示 - 日数が1以上の場合のみ表示 */}
                  {attendanceDaysMap[student.id] > 0 && (
                    <Badge
                      position="absolute"
                      top="-11px"
                      left="20%"
                      transform="translateX(-50%)"
                      colorScheme={isFrequent ? "purple" : "blue"} // 頻繁な出勤者は紫色のバッジ
                      fontSize={`${0.7 * scale}rem`}
                      borderRadius="full"
                      px={2.5}
                      py={0.5}
                      boxShadow="0 1px 2px rgba(0,0,0,0.2)"
                      // fontWeight={isFrequent ? "bold" : "medium"} // 頻繁な出勤者は太字
                    >
                      {attendanceDaysMap[student.id]}日
                    </Badge>
                  )}
                  
                  <Text 
                    fontSize={fontSize} 
                    textAlign="center" 
                    width="100%" 
                    overflow="hidden" 
                    textOverflow="ellipsis"
                    whiteSpace="nowrap" // 改行を防止
                    color="#131113" // すべての学生の名前の色を黒に統一
                  >
                    {student.name}
                  </Text>
                  
                  {/* 出勤中の場合のバッジ表示 - クライアントサイドでのみレンダリング */}
                  {isClient && attendanceStates[student.id]?.isAttending && (
                    <Badge
                      colorScheme="green"
                      position="absolute"
                      bottom="-13px"
                      right="-5px"
                      fontSize={`${0.8 * scale}rem`}
                      zIndex={2}
                      borderRadius="full"
                      px={2}
                      py={1}
                      boxShadow={"0px 0px 3px rgb(109, 109, 109)"}
                    >
                      {attendanceStates[student.id]?.attendanceTime ? 
                        `${new Date(attendanceStates[student.id].attendanceTime!).getHours()}:${String(new Date(attendanceStates[student.id].attendanceTime!).getMinutes()).padStart(2, '0')} 出勤` : 
                        '出勤中'}
                    </Badge>
                  )}
                  
                  {/* 退勤済の場合のバッジとスライドする滞在時間バッジ - クライアントサイドでのみレンダリング */}
                  {isClient && attendanceStates[student.id]?.leavingTime && !attendanceStates[student.id]?.isAttending && (
                    <>
                      {/* 退勤時間バッジ（フェードイン・アウト） */}
                      <Badge
                        colorScheme="red"
                        position="absolute"
                        bottom="-13px"
                        right="-5px"
                        fontSize={`${0.8 * scale}rem`}
                        zIndex={2}
                        borderRadius="full"
                        px={2}
                        py={1}
                        boxShadow={"0px 0px 3px rgb(109, 109, 109)"}
                        animation={`${fadeInOut} 10s infinite`}
                      >
                        {attendanceStates[student.id]?.leavingTime ? 
                          `${new Date(attendanceStates[student.id].leavingTime!).getHours()}:${String(new Date(attendanceStates[student.id].leavingTime!).getMinutes()).padStart(2, '0')} 退勤` : 
                          '退勤済'}
                      </Badge>
                      
                      {/* 滞在時間バッジ（フェードアウト・イン） */}
                      {attendanceStates[student.id]?.totalStayTime > 0 && (
                        <Badge
                          colorScheme="blue"
                          position="absolute"
                          bottom="-13px"
                          right="-5px"
                          fontSize={`${0.8 * scale}rem`}
                          zIndex={2}
                          borderRadius="full"
                          px={2}
                          py={1}
                          boxShadow={"0px 0px 3px rgb(109, 109, 109)"}
                          animation={`${fadeOutIn} 10s infinite`}
                        >
                          {formatStayTime(attendanceStates[student.id].totalStayTime)}
                        </Badge>
                      )}
                    </>
                  )}
                </Box>
              </WrapItem>
            );
          })}
        </Wrap>
      </Box>

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