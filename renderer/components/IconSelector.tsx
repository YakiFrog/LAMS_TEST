import React from 'react';
import { Box, SimpleGrid, Button, Text, useColorModeValue } from '@chakra-ui/react';
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
  // ロボット工学科向けの追加アイコン
  { id: 'microchip', icon: FaMicrochip, label: 'マイクロチップ' },
  { id: 'vrCardboard', icon: FaVrCardboard, label: 'VR' },
  { id: 'cogs', icon: FaCogs, label: '歯車' },
  { id: 'drone', icon: FaPlane, label: 'ドローン' },
  { id: 'satellite', icon: FaSatellite, label: '衛星' },
];

// アイコンIDからアイコンコンポーネントを取得するヘルパー関数
export const getIconById = (iconId: string | null | undefined) => {
  if (!iconId) return null;
  const iconObj = availableIcons.find(i => i.id === iconId);
  return iconObj ? iconObj.icon : null;
};

interface IconSelectorProps {
  selectedIcon: string | null;
  onSelectIcon: (iconId: string) => void;
}

const IconSelector: React.FC<IconSelectorProps> = ({ selectedIcon, onSelectIcon }) => {
  const hoverBg = useColorModeValue('blue.100', 'blue.700');
  const selectedBg = useColorModeValue('blue.200', 'blue.600');

  return (
    <Box>
      <Text mb={4} fontWeight="bold">アイコンを選択してください</Text>
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
            <Icon size="1.5em" />
            {/* <Text fontSize="xs" mt={1} textAlign="center" noOfLines={1}>{label}</Text> */}
          </Button>
        ))}
      </SimpleGrid>
      {selectedIcon && (
        <Box mt={4} textAlign="center">
          <Text>選択中: {availableIcons.find(i => i.id === selectedIcon)?.label || selectedIcon}</Text>
        </Box>
      )}
    </Box>
  );
};

export default IconSelector;
