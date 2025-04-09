return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="4xl">
      <ModalOverlay/>
      <ModalContent 
        maxHeight="80%" 
        borderRadius="3xl" 
        pb={4} 
        outline="10px solid red" outlineOffset="5px"
        bg="none"
      >
        {/* ヘッダー: 学生名またはデフォルトのタイトルが表示されます
        <ModalHeader
          fontSize={"2xl"}
          fontWeight={"bold"}
          justifyContent="center"
          textAlign="center"
          display="flex"
          flexDirection="column" // 追加: 縦方向に並べることでIDを改行表示
          mt={2}
          mb={0}
        >
            {student ? student.name : "学生情報"}
            <Text fontSize={"sm"} fontWeight={"bold"} color={"gray.500"} mt={0}>
              ID: {student?.id}
            </Text>
        </ModalHeader>
        {/* モーダルを閉じるボタン */}
        {/* <ModalCloseButton size="lg" right={6} top={4} border={"1px solid red"} borderRadius="xl" bg="red.500" _hover={{ bg: "red.600" }} color="white"/> */}

        <ModalBody p={4}>
          <VStack spacing={4} align="stretch">
            {/* 出勤情報と統計の枠 */}
            <Box 
              border="1px solid #ccc" 
              borderRadius="2xl" 
              p={4}
            >
              {/* 出退勤時刻の表示エリア */}
              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
                <Text fontSize={"xl"} fontWeight={"bold"}>
                  出勤: <Text as="span" fontSize="3xl" letterSpacing="wider">{attendanceTimeStr ? attendanceTimeStr : "未登録"}</Text>
                </Text>
                <Text fontSize={"xl"} fontWeight={"bold"} ml={6}>
                  退勤: <Text as="span" fontSize="3xl" letterSpacing="wider">{leavingTimeStr ? leavingTimeStr : "未登録"}</Text>
                </Text>
              </div>

              <Box mt={4}>
                {student ? (
                  <VStack spacing={4}>
                    {/* 曜日出勤状況の表示 */}
                    {student.id && <WeekdayAttendanceIndicator studentId={student.id} />}
                    
                    {/* 週・月・年の出勤統計を表示 */}
                    {student.id && <AttendanceStatistics studentId={student.id} />}
                  </VStack>
                ) : (
                  <Text>No student selected.</Text>
                )}
              </Box>
              
              <Text fontSize={"xl"} fontWeight={"bold"} textAlign={"center"} mt={4}>
                滞在時間: <Text as="span" fontSize="3xl">{totalStayTimeStr ? totalStayTimeStr : "未登録"}</Text>
              </Text>
            </Box>
            
            {/* 年間出勤カレンダーの枠 */}
            {student && student.id && (
              <Box 
                border="1px solid #ccc" 
                borderRadius="2xl" 
                p={4}
              >
                <Text fontSize="xl" fontWeight="bold" textAlign="center" mb={4}>
                  年間出勤カレンダー
                </Text>
                <Box 
                  overflowX="auto"
                  whiteSpace="nowrap"
                  pb={4}
                  css={{
                    /* カスタムスクロールバースタイル */
                    '&::-webkit-scrollbar': {
                      height: '12px',
                      display: 'block',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: '#f1f1f1',
                      borderRadius: '6px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#888',
                      borderRadius: '6px',
                      border: '2px solid #f1f1f1',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      background: '#555',
                    },
                    /* スクロールバーを常に表示 */
                    '-webkit-overflow-scrolling': 'touch',
                    'scrollbar-width': 'auto',
                    'scrollbar-color': '#888 #f1f1f1',
                  }}
                >
                  <YearlyAttendanceCalendar studentId={student.id} />
                </Box>
              </Box>
            )}
            
            {/* 出退勤ボタン */}
            <Button
              colorScheme={student && getAttendanceState(student.id).isAttending ? "red" : "green"}
              onClick={handleAttendance}
              borderRadius="3xl"
              width="100%"
              height="7vh"
              fontSize={"4xl"}
              fontWeight="black"
              letterSpacing="widest"
              boxShadow="0 0 5px 1px rgba(0, 0, 0, 0.3), inset 0 3px 10px rgba(233, 233, 233, 0.78), inset 0 -3px 10px rgba(0, 0, 0, 0.35)"
            >
              {student && getAttendanceState(student.id).isAttending ? "退勤" : "出勤"}
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};