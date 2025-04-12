/**
 * 学生データを管理するユーティリティ
 */

// 学生情報インターフェース
export interface Student {
  id: string;
  name: string;
  grade: '教員' | 'M2' | 'M1' | 'B4';
}

// 永続化された学生マップ
let cachedStudentsMap: Record<string, Student> = null;

/**
 * 学生データのマップを取得する
 * ローカルストレージと現在のデータをマージして最新の状態を提供
 */
export function getStudentsMap(): Record<string, Student> {
  if (cachedStudentsMap !== null) {
    return { ...cachedStudentsMap };
  }
  
  try {
    // ブラウザ環境かチェック
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return {};
    }
    
    const storedStudents = localStorage.getItem('students');
    if (storedStudents) {
      const parsedStudents = JSON.parse(storedStudents) as Student[];
      
      // IDをキーとしたマップを作成
      const studentMap: Record<string, Student> = {};
      parsedStudents.forEach(student => {
        studentMap[student.id] = student;
      });
      
      cachedStudentsMap = studentMap;
      return { ...studentMap };
    }
  } catch (error) {
    console.error('学生データ取得エラー:', error);
  }
  
  return {};
}

/**
 * 学生情報を取得する
 * @param studentId 学生ID
 * @returns 学生情報（存在しない場合はnull）
 */
export function getStudentById(studentId: string): Student | null {
  const studentsMap = getStudentsMap();
  return studentsMap[studentId] || null;
}

/**
 * 学生名を取得する
 * @param studentId 学生ID
 * @returns 学生名、見つからない場合は「不明」を返す
 */
export function getStudentNameById(studentId: string): string {
  if (!studentId) return '不明';
  
  try {
    const storedStudents = localStorage.getItem('students');
    if (storedStudents) {
      const students = JSON.parse(storedStudents);
      const student = students.find((s: any) => s.id === studentId);
      return student ? student.name : '不明';
    }
  } catch (error) {
    console.error('学生データ取得エラー:', error);
  }
  
  return '不明';
}

/**
 * キャッシュを更新する
 * @param students 学生リスト
 */
export function updateStudentsCache(students: Student[]): void {
  // 新しいマップを作成
  const newMap: Record<string, Student> = {};
  students.forEach(student => {
    newMap[student.id] = student;
  });
  
  // キャッシュを更新
  cachedStudentsMap = newMap;
}

/**
 * 学生リストを取得する
 * @returns 学生リスト
 */
export function getAllStudents(): Student[] {
  const studentsMap = getStudentsMap();
  return Object.values(studentsMap);
}

/**
 * 学生IDから学生の学年を取得する
 * @param studentId 学生ID
 * @returns 学年、見つからない場合は「不明」を返す
 */
export function getStudentGradeById(studentId: string): string {
  if (!studentId) return '不明';
  
  try {
    const storedStudents = localStorage.getItem('students');
    if (storedStudents) {
      const students = JSON.parse(storedStudents);
      const student = students.find((s: any) => s.id === studentId);
      return student ? student.grade : '不明';
    }
  } catch (error) {
    console.error('学生データ取得エラー:', error);
  }
  
  return '不明';
}

/**
 * 学年からバッジの色を取得する
 * @param grade 学年
 * @returns バッジの色のkeyword
 */
export function getBadgeColorByGrade(grade: string): string {
  switch (grade) {
    case '教員':
      return 'purple';
    case 'M2':
      return 'blue';
    case 'M1':
      return 'green';
    case 'B4':
      return 'orange';
    default:
      return 'gray';
  }
}
