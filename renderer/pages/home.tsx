import React, { useState, useEffect } from 'react';
import { Tabs, TabList, TabPanels, Tab, TabPanel, Button, Link as ChakraLink, Box } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import Tab1Content from '../components/Tab1Content';
import Tab2Content from '../components/Tab2Content';
import Tab3Content from '../components/Tab3Content';

const version = 'v0.3.3';

export default function HomePage() {
  const scale = 98;

  const bounce = keyframes`
  0% { transform: translateY(0) rotate(-20deg); }
  50% { transform: translateY(-10px) rotate(-20deg); }
  100% { transform: translateY(0) rotate(-20deg); }
`;

  const animation = `${bounce} 2s linear infinite`;

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
      bg= "white"
    >
    <Tabs isFitted variant="enclosed" colorScheme="blue" size="md" bg="white">
      <TabList bg="gray.100" borderRadius="full" p={2}>
      <Tab 
        fontWeight="semibold"
        _selected={{ color: 'white', bg: '#131113' }}
        px={5}
        py={2}
        mx={1}
        borderRadius="full"
        _focus={{ boxShadow: 'none' }}
      >
        メイン
      </Tab>
      <Tab
        fontWeight="semibold"
        _selected={{ color: 'white', bg: '#131113' }}
        px={5}
        py={2}
        mx={1}
        borderRadius="full"
        _focus={{ boxShadow: 'none' }}
      >
        データ
      </Tab>
      <Tab
        fontWeight="semibold"
        _selected={{ color: 'white', bg: '#131113' }}
        px={5}
        py={2}
        mx={1}
        borderRadius="full"
        _focus={{ boxShadow: 'none' }}
      >
        管理
      </Tab>
      </TabList>

      <TabPanels 
      mt={3}
      border="1px solid #ccc"
      borderRadius="3xl"
      overflow="auto"
      height={`calc(${scale}vh - 10vh)`}
      >
      <TabPanel>
        <Tab1Content />
      </TabPanel>
      <TabPanel>
        <Tab2Content />
      </TabPanel>
      <TabPanel>
        <Tab3Content />
      </TabPanel>
      </TabPanels>
    </Tabs>
    <Box
      position="fixed"
      bottom="7%"
      right="5%"
      bg="red.500"
      color="white"
      borderRadius="3xl"
      fontWeight="bold"
      fontSize="3xl"
      width="auto"
      textAlign="center"
      zIndex={9999}
      px={4}
      py={2}
      transform="rotate(-20deg)"
      letterSpacing="0.08em"
      boxShadow="0 4px 6px rgb(171, 3, 3), inset 0 4px 6px rgba(250, 249, 157, 0.61)"
      animation={animation}
      fontFamily="'Yusei Magic', sans-serif"
    >
      試作版
      <Box
      fontSize="md"
      fontWeight="normal"
      mt={0}
      letterSpacing="normal"
      fontFamily="sans-serif"
      px={2}
      >
        {version}
      </Box>
    </Box>
    </Box>
    </div>
  );
}