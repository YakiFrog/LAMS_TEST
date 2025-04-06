import React, { useContext, useMemo, useEffect } from 'react';
import { Tabs, TabList, TabPanels, Tab, TabPanel, Box } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import Tab1Content from '../components/Tab1Content';
import Tab2Content from '../components/Tab2Content';
import Tab3Content from '../components/Tab3Content';
import pkg from '../../package.json';
import { ClientContext } from './_app';

export default function HomePage() {
  const scale = 98;
  const isClient = useContext(ClientContext);

  // メモ化されたアニメーション定義
  const animation = useMemo(() => {
    const bounce = keyframes`
      0% { transform: translateY(0) rotate(-20deg); }
      50% { transform: translateY(-10px) rotate(-20deg); }
      100% { transform: translateY(0) rotate(-20deg); }
    `;
    return `${bounce} 2s linear infinite`;
  }, []);

  // タブ内容をメモ化
  const tabContents = useMemo(() => {
    // デバッグメッセージが表示されているか確認
    console.log('タブコンテンツがレンダリングされました');
    
    return [
      <Tab1Content key="tab1" />,
      <Tab2Content key="tab2" />,
      <Tab3Content key="tab3" />
    ];
  }, []);

  // 開発中のデバッグ用コードを確認
  useEffect(() => {
    // コンソールに流れているログを確認するためのコード
    const originalConsoleLog = console.log;
    console.log = function(...args) {
      if (args[0]?.includes && args[0].includes('Mock fileExists')) {
        console.warn('ファイル存在確認ログを検出:', ...args);
        // 呼び出し元の情報を表示（デバッグ用）
        console.trace('このログの呼び出し元');
      }
      originalConsoleLog.apply(console, args);
    };
    
    return () => {
      console.log = originalConsoleLog;
    };
  }, []);

  // 試作版バッジのクリックハンドラ
  const handleVersionBadgeClick = () => {
    const commentElement = document.getElementById('demo-comment');
    if (commentElement) {
      commentElement.style.opacity = '1';
      setTimeout(() => {
        commentElement.style.opacity = '0';
      }, 2000);
    }
  };

  // 共通のタブスタイル
  const commonTabStyle = {
    fontWeight: "semibold",
    mx: 1,
    borderRadius: "3xl",
    _focus: { boxShadow: 'none' },
    letterSpacing: "wider",
    _selected: { color: 'white', bg: '#131113' }
  };

  return (
    <div style={{ backgroundColor: '#131113', height: '100vh' }}>
      <Box 
        p={4}
        width={`${scale}vw`}
        height={`${scale}vh`}
        maxW="100vw"
        maxH="100vh"
        margin="auto"
        border="1px solid #ccc" 
        borderRadius="3xl"
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        overflow="hidden"
        bg="white"
      >
        <Tabs
          isFitted
          variant="enclosed"
          colorScheme="blue"
          size="md"
          bg="white"
        >
          <TabList bg="gray.200" borderRadius="3xl" p={2} mt={0}>
            <Tab {...commonTabStyle}>メイン</Tab>
            <Tab {...commonTabStyle}>データ</Tab>
            <Tab {...commonTabStyle}>管理</Tab>
          </TabList>

          <TabPanels 
            mt={3}
            border="1px solid #ccc"
            borderColor="gray.300"
            borderRadius="3xl"
            overflow="auto"
            height={`calc(${scale}vh - 10vh)`}
          >
            {tabContents.map((content, index) => (
              <TabPanel key={index}>
                {content}
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
        
        <Box
          position="fixed"
          bottom="6%"
          right="5%"
          bg="red.500"
          color="white"
          borderRadius="2xl"
          fontWeight="bold"
          fontSize="2xl"
          width="auto"
          textAlign="center"
          zIndex={9999}
          px={5}
          py={1.5}
          transform="rotate(-20deg)"
          letterSpacing="0.08em"
          boxShadow="0 4px 6px rgb(171, 3, 3), inset 0 4px 6px rgba(250, 249, 157, 0.61)"
          animation={animation}
          fontFamily="'Yusei Magic', sans-serif"
          onClick={handleVersionBadgeClick}
          cursor="pointer"
          _hover={{ transform: "rotate(-20deg) scale(1.05)" }}
          transition="transform 0.2s"
        >
          <Box
            id="demo-comment"
            position="absolute"
            bottom="110%"
            left="50%"
            transform="translateX(-50%)"
            bg="rgba(0,0,0,0.7)"
            color="white"
            py={1}
            px={3}
            borderRadius="md"
            opacity="0"
            transition="opacity 0.3s"
            fontSize="sm"
            whiteSpace="nowrap"
          >
            {`${pkg.versionDescription}`}
          </Box>
          試作版
          <Box
            fontSize="xs"
            fontWeight="normal"
            mt={0}
            letterSpacing="normal"
            fontFamily="sans-serif"
            px={4}
          >
            {`v${pkg.version}`}
          </Box>
        </Box>
      </Box>
    </div>
  );
}