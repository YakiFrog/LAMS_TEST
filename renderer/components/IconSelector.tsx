import React, { useState, useMemo } from 'react';
import { Box, SimpleGrid, Button, Text, useColorModeValue, Tabs, TabList, Tab, TabPanels, TabPanel, HStack, Flex, IconButton, Center } from '@chakra-ui/react';
import { ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { FaUserGraduate, FaCode, FaLaptopCode, FaBook, FaChalkboardTeacher, FaCoffee, 
  FaBrain, FaLightbulb, FaFlask, FaMicroscope, FaRobot, FaCalculator, FaChartLine,
  FaPuzzlePiece, FaGamepad, FaHeadphones, FaMoon, FaStar, FaRocket, 
  FaMicrochip, FaVrCardboard, FaCogs, FaPlane, FaSatellite,
  FaMicrophone, FaWater, FaMagnet, FaCarCrash, FaUser, FaSkull, FaGhost, 
  FaVolumeUp, FaWaveSquare, FaWind, FaStopCircle, FaUserAlt, FaBone,
  FaCar, FaTaxi, FaTruck, FaBus, FaMicrochip as FaChip, FaMemory, FaBrain as FaAI, FaNetworkWired,
  FaPlaystation, FaXbox, FaDesktop, FaChess, FaDice, FaChessBoard } from 'react-icons/fa';
import { SiAtari, SiSega, SiNintendoswitch as FaNintendoSwitch,
  SiApple, SiGoogle, SiAmazon, SiFacebook, SiX,
  SiNetflix, SiTesla, SiSamsung, SiSony, SiAdobe, SiIntel } from 'react-icons/si';
import { GiJoystick as FaJoystick } from 'react-icons/gi';

export const availableIcons = [
  { id: 'userGraduate', icon: FaUserGraduate, label: '卒業生' },
  { id: 'code', icon: FaCode, label: 'コード' },
  { id: 'laptopCode', icon: FaLaptopCode, label: 'ラップトップ' },
  { id: 'book', icon: FaBook, label: '本' },
  { id: 'chalkboardTeacher', icon: FaChalkboardTeacher, label: '教師' },
  { id: 'coffee', icon: FaCoffee, label: 'コーヒー' },
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
  { id: 'microphone', icon: FaMicrophone, label: '音声' },
  { id: 'volumeUp', icon: FaVolumeUp, label: '音量' },
  { id: 'water', icon: FaWater, label: '水面' },
  { id: 'wave', icon: FaWaveSquare, label: '波形' },
  { id: 'magnet', icon: FaMagnet, label: '磁石' },
  { id: 'brake', icon: FaCarCrash, label: 'ブレーキ' },
  { id: 'stop', icon: FaStopCircle, label: '停止' },
  { id: 'userAlt', icon: FaUserAlt, label: '人物' },
  { id: 'skull', icon: FaSkull, label: 'ガイコツ' },
  { id: 'bone', icon: FaBone, label: '骨' },
  { id: 'ghost', icon: FaGhost, label: 'おばけ' },
  { id: 'wind', icon: FaWind, label: '風' },
  { id: 'car', icon: FaCar, label: '車' },
  { id: 'taxi', icon: FaTaxi, label: 'タクシー' },
  { id: 'truck', icon: FaTruck, label: 'トラック' },
  { id: 'bus', icon: FaBus, label: 'バス' },
  { id: 'ai', icon: FaAI, label: 'AI' },
  { id: 'chip', icon: FaChip, label: 'チップ' },
  { id: 'memory', icon: FaMemory, label: 'メモリ' },
  { id: 'network', icon: FaNetworkWired, label: 'ネットワーク' },
  { id: 'playstation', icon: FaPlaystation, label: 'PS' },
  { id: 'xbox', icon: FaXbox, label: 'Xbox' },
  { id: 'nintendoSwitch', icon: FaNintendoSwitch, label: 'Switch' },
  { id: 'atari', icon: SiAtari, label: 'Atari' },
  { id: 'sega', icon: SiSega, label: 'SEGA' },
  { id: 'joystick', icon: FaJoystick, label: 'ジョイスティック' },
  { id: 'chess', icon: FaChess, label: 'チェス' },
  { id: 'dice', icon: FaDice, label: 'サイコロ' },
  { id: 'apple', icon: SiApple, label: 'Apple' },
  { id: 'google', icon: SiGoogle, label: 'Google' },
  { id: 'amazon', icon: SiAmazon, label: 'Amazon' },
  { id: 'twitter', icon: SiX, label: 'Twitter' },
  { id: 'tesla', icon: SiTesla, label: 'Tesla' },
  { id: 'sony', icon: SiSony, label: 'Sony' },
  { id: 'adobe', icon: SiAdobe, label: 'Adobe' },
  { id: 'intel', icon: SiIntel, label: 'Intel' },
];

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

export const getIconById = (iconId: string | null | undefined) => {
  if (!iconId) return null;
  const iconObj = availableIcons.find(i => i.id === iconId);
  return iconObj ? iconObj.icon : null;
};

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
  
  const [currentPage, setCurrentPage] = useState(0);
  const iconsPerPage = 20;
  
  const paginatedIcons = useMemo(() => {
    const totalPages = Math.ceil(availableIcons.length / iconsPerPage);
    const pages = [];
    
    for (let i = 0; i < totalPages; i++) {
      const startIndex = i * iconsPerPage;
      const endIndex = startIndex + iconsPerPage;
      pages.push(availableIcons.slice(startIndex, endIndex));
    }
    
    return pages;
  }, []);
  
  const goToPrevPage = () => {
    setCurrentPage(prev => (prev > 0 ? prev - 1 : 0));
  };
  
  const goToNextPage = () => {
    setCurrentPage(prev => (prev < paginatedIcons.length - 1 ? prev + 1 : prev));
  };

  return (
    <Box>
      <Tabs isFitted variant="enclosed" index={tabIndex} onChange={(index) => setTabIndex(index)} mb={4}>
        <TabList>
          <Tab>アイコン</Tab>
          <Tab>アイコン色</Tab>
          <Tab>背景色</Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel>
            <Text mb={2} fontWeight="bold">アイコンを選択</Text>
            
            <Flex justify="center" mb={2}>
              <IconButton
                aria-label="前のページ"
                icon={<ChevronUpIcon boxSize={6} />}
                onClick={goToPrevPage}
                isDisabled={currentPage === 0}
                colorScheme="blue"
                variant="ghost"
                size="sm"
              />
              <Text mx={3} fontWeight="medium">{currentPage + 1} / {paginatedIcons.length}</Text>
              <IconButton
                aria-label="次のページ"
                icon={<ChevronDownIcon boxSize={6} />}
                onClick={goToNextPage}
                isDisabled={currentPage === paginatedIcons.length - 1}
                colorScheme="blue"
                variant="ghost"
                size="sm"
              />
            </Flex>
            
            <SimpleGrid columns={5} spacing={2} height="300px">
              {paginatedIcons[currentPage]?.map(({ id, icon: Icon, label }) => (
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
            
            <Flex justify="center" mt={3}>
              <Button 
                leftIcon={<ChevronUpIcon />}
                onClick={goToPrevPage}
                isDisabled={currentPage === 0}
                colorScheme="blue"
                size="sm"
                mr={2}
              >
                前へ
              </Button>
              <Button 
                rightIcon={<ChevronDownIcon />} 
                onClick={goToNextPage}
                isDisabled={currentPage === paginatedIcons.length - 1}
                colorScheme="blue"
                size="sm"
              >
                次へ
              </Button>
            </Flex>
          </TabPanel>
          
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
