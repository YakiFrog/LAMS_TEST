import React, { useState } from 'react';
import { Box, SimpleGrid, Button, Text, useColorModeValue, Tabs, TabList, Tab, TabPanels, TabPanel, HStack, Flex } from '@chakra-ui/react';
import { FaUserGraduate, FaCode, FaLaptopCode, FaBook, FaChalkboardTeacher, FaCoffee, 
  FaBrain, FaLightbulb, FaFlask, FaMicroscope, FaRobot, FaCalculator, FaChartLine,
  FaPuzzlePiece, FaGamepad, FaHeadphones, FaMoon, FaStar, FaRocket, 
  FaMicrochip, FaVrCardboard, FaCogs, FaPlane, FaSatellite } from 'react-icons/fa';

// 利用可能なアイコンの定義
export const availableIcons = [
  { id: 'userGraduate', icon: FaUserGraduate, label: '卒業生' },
  { id: 'code', icon: FaCode, label: 'コード' },
  { id: 'laptopCode', icon: FaLaptopCode, label: 'ラップトップ' },
  { id: 'book', icon: FaBook, label: '本' },
  { id: 'chalkboardTeacher', icon: FaChalkboardTeacher, label: '教師' },
  { id: 'coffee', icon: FaCoffee, label: 'コーヒー' },
  { id: 'brain', icon: FaBrain, label: '脳' },
  { id: 'lightbulb', icon: FaLightbulb, label: '電球' },
  { id: 'flask', icon: FaFlask, label: 'フラスコ' },
  { id: 'microscope', icon: FaMicroscope, label: '顕微鏡' },
  { id: 'robot', icon: FaRobot, label: 'ロボット' },
  { id: 'calculator', icon: FaCalculator, label: '計算機' },
  { id: 'chartLine', icon: FaChartLine, label: 'グラフ' },
  { id: 'puzzlePiece', icon: FaPuzzlePiece, label: 'パズル' },
  { id: 'gamepad', icon: FaGamepad, label: 'ゲーム' },
  { id: 'headphones', icon: FaHeadphones, label: 'ヘッドホン' },
  { id: 'moon', icon: FaMoon, label: '月' },
  { id: 'star', icon: FaStar, label: '星' },
  { id: 'rocket', icon: FaRocket, label: 'ロケット' },
  { id: 'microchip', icon: FaMicrochip, label: 'マイクロチップ' },
  { id: 'vrCardboard', icon: FaVrCardboard, label: 'VR' },
  { id: 'cogs', icon: FaCogs, label: '歯車' },
  { id: 'drone', icon: FaPlane, label: 'ドローン' },
  { id: 'satellite', icon: FaSatellite, label: '衛星' },
];

// 利用可能なアイコン色の定義
export const availableIconColors = [
  { id: 'default', value: '#131113', label: 'デフォルト' },
  { id: 'blue', value: '#3182CE', label: '青' },
  { id: 'green', value: '#38A169', label: '緑' },
  { id: 'red', value: '#E53E3E', label: '赤' },
  { id: 'purple', value: '#805AD5', label: '紫' },
  { id: 'orange', value: '#DD6B20', label: 'オレンジ' },
  { id: 'teal', value: '#319795', label: 'ティール' },
  { id: 'pink', value: '#D53F8C', label: 'ピンク' },
  { id: 'yellow', value: '#D69E2E', label: '黄色' },
];

// 利用可能な背景色の定義
export const availableBackgroundColors = [
  { id: 'white', value: '#FFFFFF', label: '白' },
  { id: 'gray', value: '#E2E8F0', label: 'グレー' },
  { id: 'lightblue', value: '#BEE3F8', label: '水色' },
  { id: 'lightgreen', value: '#C6F6D5', label: '薄緑' },
  { id: 'lightred', value: '#FED7D7', label: '薄赤' },
  { id: 'lightpurple', value: '#E9D8FD', label: '薄紫' },
  { id: 'lightorange', value: '#FEEBC8', label: '薄橙' },
  { id: 'lightyellow', value: '#FEFCBF', label: '薄黄' },
  { id: 'lightpink', value: '#FED7E2', label: '薄桃' },
];

// アイコンIDからアイコンコンポーネントを取得するヘルパー関数
export const getIconById = (iconId: string | null | undefined) => {
  if (!iconId) return null;
  const iconObj = availableIcons.find(i => i.id === iconId);
  return iconObj ? iconObj.icon : null;
};

// 設定の型定義を更新
export interface IconSettings {
  iconId: string;
  iconColor: string;
  bgColor: string;
}

interface IconSelectorProps {
  selectedIcon: string | null;
  selectedIconColor?: string;
  selectedBgColor?: string;
  onSelectIcon: (iconId: string) => void;
  onSelectIconColor?: (color: string) => void;
  onSelectBgColor?: (color: string) => void;
}

const IconSelector: React.FC<IconSelectorProps> = ({ 
  selectedIcon, 
  selectedIconColor = '#131113',
  selectedBgColor = '#FFFFFF',
  onSelectIcon, 
  onSelectIconColor = () => {},
  onSelectBgColor = () => {}
}) => {
  const hoverBg = useColorModeValue('blue.100', 'blue.700');
  const selectedBg = useColorModeValue('blue.200', 'blue.600');
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <Box>
      <Tabs isFitted variant="enclosed" index={tabIndex} onChange={(index) => setTabIndex(index)} mb={4}>
        <TabList>
          <Tab>アイコン</Tab>
          <Tab>アイコン色</Tab>
          <Tab>背景色</Tab>
        </TabList>
        
        <TabPanels>
          {/* アイコン選択パネル */}
          <TabPanel>
            <Text mb={2} fontWeight="bold">アイコンを選択</Text>
            <SimpleGrid columns={5} spacing={2}>
              {availableIcons.map(({ id, icon: Icon, label }) => (
                <Button
                  key={id}
                  variant="outline"
                  height="60px"
                  width="60px"
                  border="3px solid"
                  borderColor={selectedIcon === id ? 'blue.500' : 'gray.200'}
                  bg={selectedIcon === id ? selectedBg : 'transparent'}
                  _hover={{ bg: selectedIcon !== id ? hoverBg : selectedBg }}
                  onClick={() => onSelectIcon(id)}
                  aria-label={label}
                  title={label}
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon size="1.5em" color={selectedIconColor} />
                </Button>
              ))}
            </SimpleGrid>
          </TabPanel>
          
          {/* アイコン色選択パネル */}
          <TabPanel>
            <Text mb={2} fontWeight="bold">アイコンの色を選択</Text>
            <SimpleGrid columns={5} spacing={2}>
              {availableIconColors.map(({ id, value, label }) => (
                <Button
                  key={id}
                  variant="outline"
                  height="60px"
                  width="60px"
                  border="3px solid"
                  borderColor={selectedIconColor === value ? 'blue.500' : 'gray.200'}
                  bg={selectedIconColor === value ? selectedBg : 'transparent'}
                  _hover={{ bg: selectedIconColor !== value ? hoverBg : selectedBg }}
                  onClick={() => onSelectIconColor(value)}
                  aria-label={label}
                  title={label}
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Box 
                    width="30px" 
                    height="30px" 
                    borderRadius="full" 
                    bg={value}
                    boxShadow="0 1px 3px rgba(0,0,0,0.3)"
                  />
                  <Text fontSize="xs" mt={1}>{label}</Text>
                </Button>
              ))}
            </SimpleGrid>
          </TabPanel>
          
          {/* 背景色選択パネル */}
          <TabPanel>
            <Text mb={2} fontWeight="bold">背景の色を選択</Text>
            <SimpleGrid columns={5} spacing={2}>
              {availableBackgroundColors.map(({ id, value, label }) => (
                <Button
                  key={id}
                  variant="outline"
                  height="60px"
                  width="60px"
                  border="3px solid"
                  borderColor={selectedBgColor === value ? 'blue.500' : 'gray.200'}
                  bg={selectedBgColor === value ? selectedBg : 'transparent'}
                  _hover={{ bg: selectedBgColor !== value ? hoverBg : selectedBg }}
                  onClick={() => onSelectBgColor(value)}
                  aria-label={label}
                  title={label}
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Box 
                    width="30px" 
                    height="30px" 
                    borderRadius="full" 
                    bg={value}
                    boxShadow="0 1px 2px rgba(0,0,0,0.1)"
                  />
                  <Text fontSize="xs" mt={1}>{label}</Text>
                </Button>
              ))}
            </SimpleGrid>
          </TabPanel>
        </TabPanels>
      </Tabs>
      
      {/* 選択したアイコンのプレビュー */}
      {selectedIcon && (
        <Box mt={2} textAlign="center">
          <Text mb={2}>プレビュー</Text>
          <Flex justify="center" align="center">
            <Box
              width="60px"
              height="60px"
              borderRadius="full"
              bg={selectedBgColor}
              display="flex"
              alignItems="center"
              justifyContent="center"
              boxShadow="0 2px 4px rgba(0,0,0,0.2)"
            >
              {React.createElement(
                availableIcons.find(i => i.id === selectedIcon)?.icon || FaUserGraduate, 
                { size: 30, color: selectedIconColor }
              )}
            </Box>
          </Flex>
          <HStack spacing={1} mt={3} justify="center">
            <Text fontSize="sm">アイコン:</Text>
            <Text fontSize="sm" fontWeight="bold">{availableIcons.find(i => i.id === selectedIcon)?.label || selectedIcon}</Text>
          </HStack>
        </Box>
      )}
    </Box>
  );
};

export default IconSelector;
