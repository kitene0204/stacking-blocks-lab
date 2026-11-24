export interface BlockCoord {
  x: number; // 0 .. gridSize - 1 (Left -> Right from Front)
  y: number; // 0 .. gridSize - 1 (Floor 1층 -> Top N층)
  z: number; // 0 .. gridSize - 1 (Back -> Front)
}

export interface BlockData extends BlockCoord {
  color: string;
}

export type BlockMap = Record<string, BlockData>;

export type ToolMode = 'build' | 'erase';

export type AppMode = 'sandbox' | 'mission';

export type SideViewDirection = 'right' | 'left';

export type CameraPreset = 'home' | 'front' | 'right' | 'left' | 'back' | 'top';

export type ProjectionType = 'perspective' | 'orthographic';

export interface CameraAngles {
  theta: number; // azimuth around Y in radians (0 = +Z front, PI/2 = +X right)
  phi: number;   // polar from +Y in radians (0.01 = top, PI/2 = horizontal)
}

export interface ProjectionResult {
  /** front[y][x]: y=0 is bottom (1층), x=0 is left */
  front: boolean[][];
  /** rightSide[y][c]: y=0 is bottom (1층), c=0 is front (z=N-1), c=N-1 is back (z=0) */
  rightSide: boolean[][];
  /** leftSide[y][c]: y=0 is bottom (1층), c=0 is back (z=0), c=N-1 is front (z=N-1) */
  leftSide: boolean[][];
  /** topMask[z][x]: z=0 is back (top of diagram), z=N-1 is front (bottom of diagram) */
  topMask: boolean[][];
  /** topCounts[z][x]: number of blocks in column (x, z) */
  topCounts: number[][];
  /** layers[y][z][x]: 2D grid for each floor y (0 = 1층) */
  layers: boolean[][][];
  /** highest occupied layer index + 1 (0 if empty) */
  maxLayer: number;
  /** true if any block has y > 0 with no block directly underneath */
  hasFloatingBlocks: boolean;
  /** total number of blocks */
  totalCount: number;
}

export type MissionType = 'three-views' | 'top-numbers' | 'layers' | 'count-quiz';

export interface Mission {
  id: string;
  type: MissionType;
  difficulty: '기초' | '보통' | '도전';
  title: string;
  curriculumTag: string;
  description: string;
  hint: string;
  gridSize: number;
  /** Sample valid block coordinates that define the puzzle's target views or quiz shape */
  solutionCoords: BlockCoord[];
  /** Optional goal for three-views: 'any' | 'min' | 'max' */
  countGoal?: 'any' | 'min' | 'max';
}

export interface MissionCheckResult {
  isSolved: boolean;
  frontMatch: boolean;
  sideMatch: boolean;
  topMatch: boolean;
  numbersMatch: boolean;
  layersMatch: boolean;
  noFloating: boolean;
  countGoalMet: boolean;
  currentCount: number;
  minCount?: number;
  maxCount?: number;
  feedback: string;
}

export const BLOCK_PALETTE = [
  { name: '원목 베이지', hex: '#e8b97d' },
  { name: '스카이 블루', hex: '#38bdf8' },
  { name: '민트 그린', hex: '#34d399' },
  { name: '레몬 옐로', hex: '#fbbf24' },
  { name: '코랄 핑크', hex: '#fb7185' },
  { name: '라벤더 퍼플', hex: '#a78bfa' },
] as const;

export const LAYER_COLORS = [
  '#38bdf8', // 1층: 파랑
  '#34d399', // 2층: 초록
  '#fbbf24', // 3층: 노랑
  '#fb923c', // 4층: 주황
  '#f472b6', // 5층: 분홍
  '#a78bfa', // 6층: 보라
  '#2dd4bf', // 7층: 청록
] as const;
