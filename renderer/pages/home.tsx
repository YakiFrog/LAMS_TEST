import React, { useState } from 'react';
import { Tabs, TabList, TabPanels, Tab, TabPanel, Button, Link as ChakraLink, Box } from '@chakra-ui/react';
import Tab1Content from '../components/Tab1Content';
import Tab2Content from '../components/Tab2Content';
import Tab3Content from '../components/Tab3Content';

export default function HomePage() {
  return (
    <Box 
      p={4}
      width="95%"
      height="95%"
      margin="auto"
      border="1px solid #ccc" 
      borderRadius="2xl"
      position="fixed"
      top="50%"
      left="50%"
      transform="translate(-50%, -50%)"
    >
    <Tabs isFitted variant="enclosed">
      <TabList>
        <Tab>メイン</Tab>
        <Tab>データ</Tab>
        <Tab>管理</Tab>
      </TabList>

      <TabPanels 
        mt={2}
        border="1px solid #ccc"
        borderRadius="2xl"
        overflow="auto"
        height="87vh"
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