import React, { useState } from 'react';
import { Tabs, TabList, TabPanels, Tab, TabPanel, Button, Link as ChakraLink, Box } from '@chakra-ui/react';
import Tab1Content from '../components/Tab1Content';
import Tab2Content from '../components/Tab2Content';
import Tab3Content from '../components/Tab3Content';

export default function HomePage() {
  const scale = 98;
  
  return (
    <Box 
      p={4}
      width={`${scale}vw`}
      height={`${scale}vh`}
      maxW="100vw"
      maxH="100vh"
      margin="auto"
      border="1px solid #ccc" 
      borderRadius="2xl"
      position="fixed"
      top="50%"
      left="50%"
      transform="translate(-50%, -50%)"
      overflow="hidden"
    >
    <Tabs isFitted variant="enclosed" colorScheme="blue" size="lg">
      <TabList>
      <Tab>メイン</Tab>
      <Tab>データ</Tab>
      <Tab>管理</Tab>
      </TabList>

      <TabPanels 
      mt={3}
      border="1px solid #ccc"
      borderRadius="2xl"
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
    </Box>
  );
}