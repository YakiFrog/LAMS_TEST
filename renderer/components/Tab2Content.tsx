import React, { useState, useEffect } from 'react';

const Tab2Content: React.FC = () => {
  const [savedAttendanceStates, setSavedAttendanceStates] = useState<any>(null);

  // ヘルパー関数：日付の時刻部分をリセット
  const resetTime = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate; // これで月日のみの情報
  };

  const getJapanTime = (): Date => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 9 * 60 * 60000);
  };

  useEffect(() => {
    // attendanceStatesの初期化処理
    const storedAttendanceStates = localStorage.getItem('attendanceStates');
    if (storedAttendanceStates) {
      const parsedAttendanceStates = JSON.parse(storedAttendanceStates);
      const today = resetTime(getJapanTime());

      Object.keys(parsedAttendanceStates).forEach(studentId => {
        const attendanceState = parsedAttendanceStates[studentId];
        if (attendanceState) {
          // 出勤日時
          if (attendanceState.attendanceTime) {
            const attendanceDate = resetTime(new Date(attendanceState.attendanceTime));
            // 出勤日時が今日でなければ削除
            if (attendanceDate.getTime() !== today.getTime()) {
              delete parsedAttendanceStates[studentId];
              return;
            }
            attendanceState.attendanceTime = new Date(attendanceState.attendanceTime);
          }
          // 退勤日時
          if (attendanceState.leavingTime) {
            const leavingDate = resetTime(new Date(attendanceState.leavingTime));
            // 退勤日時が今日でなければ削除
            if (leavingDate.getTime() !== today.getTime()) {
              delete parsedAttendanceStates[studentId];
              return;
            }
            attendanceState.leavingTime = new Date(attendanceState.leavingTime);
          }
        }
      });

      setSavedAttendanceStates(parsedAttendanceStates);
    } else {
      setSavedAttendanceStates('No data');
    }
  }, []);

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff', color: '#000' }}>
      {/* JSON形式の場合は整形して表示 */}
      <h2>保存されている出勤状況</h2>
      <pre>
        {typeof savedAttendanceStates === 'object'
          ? JSON.stringify(savedAttendanceStates, null, 2)
          : savedAttendanceStates}
      </pre>
    </div>
  );
};

export default Tab2Content;