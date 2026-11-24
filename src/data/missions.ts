import type { BlockCoord, Mission } from '../types/blocks';

/** Helper to create stacked columns from a 2D height table (row=z: 0=back..4=front, col=x: 0=left..4=right) */
function fromHeightGrid(heights: number[][]): BlockCoord[] {
  const coords: BlockCoord[] = [];
  for (let z = 0; z < heights.length; z++) {
    for (let x = 0; x < heights[z].length; x++) {
      const h = heights[z][x];
      for (let y = 0; y < h; y++) {
        coords.push({ x, y, z });
      }
    }
  }
  return coords;
}

export const MISSIONS: Mission[] = [
  // === 1. 삼면도 보고 쌓기 (앞 / 옆 / 위) ===
  {
    id: 'tv-1',
    type: 'three-views',
    difficulty: '기초',
    title: '계단 모양 쌓기',
    curriculumTag: '초6-2 · 앞·옆·위 모양',
    description: '앞, 오른쪽 옆, 위에서 본 모양을 모두 만족하도록 쌓기나무를 쌓아 보세요.',
    hint: '위에서 본 모양으로 바닥 자리를 먼저 깔고, 앞에서 본 높이에 맞춰 층을 올려 보세요.',
    gridSize: 5,
    countGoal: 'any',
    solutionCoords: fromHeightGrid([
      [0, 0, 0, 0, 0],
      [0, 3, 2, 1, 0],
      [0, 1, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]),
  },
  {
    id: 'tv-2',
    type: 'three-views',
    difficulty: '기초',
    title: 'ㄱ자 전망대 만들기',
    curriculumTag: '초6-2 · 앞·옆·위 모양',
    description: '오른쪽 옆에서 볼 때는 앞쪽이 왼쪽, 뒤쪽이 오른쪽에 보인다는 점에 주의해 쌓아 보세요.',
    hint: '작업평면의 "앞"과 "오른쪽 옆" 표지판을 확인하고, 뷰큐브를 눌러 시점을 비교해 보세요.',
    gridSize: 5,
    countGoal: 'any',
    solutionCoords: fromHeightGrid([
      [0, 0, 0, 0, 0],
      [0, 2, 1, 1, 0],
      [0, 0, 0, 2, 0],
      [0, 0, 0, 3, 0],
      [0, 0, 0, 0, 0],
    ]),
  },
  {
    id: 'tv-3',
    type: 'three-views',
    difficulty: '도전',
    title: '가장 적은 개수로 쌓기 (최소)',
    curriculumTag: '초6-2 · 숨은 쌓기나무와 최소 개수',
    description: '앞·옆·위 모양을 만족하면서 쌓기나무를 가장 적게(6개) 사용해 완성해 보세요!',
    hint: '앞과 옆에서 2층으로 보이는 조건을 대각선 두 기둥으로 동시에 만족시키면 나머지는 1층만 쌓아도 돼요.',
    gridSize: 5,
    countGoal: 'min',
    solutionCoords: fromHeightGrid([
      [0, 0, 0, 0, 0],
      [0, 2, 1, 0, 0],
      [0, 1, 2, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]),
  },
  {
    id: 'tv-4',
    type: 'three-views',
    difficulty: '도전',
    title: '가장 많은 개수로 쌓기 (최대)',
    curriculumTag: '초6-2 · 숨은 쌓기나무와 최대 개수',
    description: '주어진 삼면도를 유지하면서 보이지 않는 자리까지 최대한 채워 가장 많은 개수(11개)로 쌓아 보세요!',
    hint: '각 칸에 쌓을 수 있는 최대 높이는 (앞에서 본 그 줄 높이)와 (옆에서 본 그 줄 높이) 중 더 작은 값이에요.',
    gridSize: 5,
    countGoal: 'max',
    solutionCoords: fromHeightGrid([
      [0, 0, 0, 0, 0],
      [0, 3, 2, 1, 0],
      [0, 2, 2, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]),
  },

  // === 2. 위에서 본 숫자표 보고 쌓기 ===
  {
    id: 'num-1',
    type: 'top-numbers',
    difficulty: '기초',
    title: '숫자 지도대로 빌딩 쌓기',
    curriculumTag: '초6-2 · 위에서 본 모양에 수 쓰기',
    description: '위에서 본 모양의 각 칸에 적힌 숫자는 그 자리에 쌓인 층수입니다. 숫자에 맞게 쌓아 보세요.',
    hint: '아래쪽이 "앞"입니다. 바닥 1층부터 각 칸의 숫자만큼 마우스 왼쪽 클릭으로 쌓아 올려 보세요.',
    gridSize: 5,
    solutionCoords: fromHeightGrid([
      [0, 0, 0, 0, 0],
      [0, 2, 3, 1, 0],
      [0, 1, 2, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0],
    ]),
  },
  {
    id: 'num-2',
    type: 'top-numbers',
    difficulty: '보통',
    title: '쌍둥이 탑 숫자표',
    curriculumTag: '초6-2 · 위에서 본 모양에 수 쓰기',
    description: '양쪽 끝이 높고 가운데가 낮은 다리 모양을 숫자표를 보고 완성해 보세요.',
    hint: '우측의 "층별 색상"을 켜면 1층·2층·3층 높이를 한눈에 확인할 수 있어요!',
    gridSize: 5,
    solutionCoords: fromHeightGrid([
      [0, 0, 0, 0, 0],
      [0, 3, 1, 3, 0],
      [0, 2, 1, 2, 0],
      [0, 1, 0, 1, 0],
      [0, 0, 0, 0, 0],
    ]),
  },
  {
    id: 'num-3',
    type: 'top-numbers',
    difficulty: '도전',
    title: '피라미드 언덕 완성',
    curriculumTag: '초6-2 · 위에서 본 모양에 수 쓰기',
    description: '가운데가 4층으로 가장 높은 피라미드 모양을 정확히 쌓아 보세요.',
    hint: '가운데 칸(3번째 가로, 3번째 세로)이 4층이고, 동서남북 네 방향이 2층이에요.',
    gridSize: 5,
    solutionCoords: fromHeightGrid([
      [0, 0, 0, 0, 0],
      [0, 1, 2, 1, 0],
      [0, 2, 4, 2, 0],
      [0, 1, 2, 1, 0],
      [0, 0, 0, 0, 0],
    ]),
  },

  // === 3. 층별 모양 보고 쌓기 ===
  {
    id: 'lay-1',
    type: 'layers',
    difficulty: '기초',
    title: '1층과 2층 설계도',
    curriculumTag: '초6-2 · 층별로 나타낸 모양',
    description: '1층 모양과 2층 모양을 차례대로 보고 똑같이 쌓아 보세요.',
    hint: '먼저 1층 그림대로 바닥에 모두 깔고, 그 위에 2층 그림에 색칠된 자리만 한 층 더 올리세요.',
    gridSize: 5,
    solutionCoords: fromHeightGrid([
      [0, 0, 0, 0, 0],
      [0, 2, 2, 1, 0],
      [0, 2, 1, 1, 0],
      [0, 1, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]),
  },
  {
    id: 'lay-2',
    type: 'layers',
    difficulty: '보통',
    title: '3층 코너 요새',
    curriculumTag: '초6-2 · 층별로 나타낸 모양',
    description: '1층, 2층, 3층 단면도를 보고 3층짜리 입체 모양을 완성해 보세요.',
    hint: '각 층을 위에서 내려다본 모양과 비교하면서 1층 → 2층 → 3층 순서로 쌓으면 쉬워요.',
    gridSize: 5,
    solutionCoords: fromHeightGrid([
      [0, 0, 0, 0, 0],
      [0, 3, 2, 1, 0],
      [0, 2, 1, 1, 0],
      [0, 1, 1, 2, 0],
      [0, 0, 0, 0, 0],
    ]),
  },
  {
    id: 'lay-3',
    type: 'layers',
    difficulty: '도전',
    title: '십자 모양 3층 탑',
    curriculumTag: '초6-2 · 층별로 나타낸 모양',
    description: '1층부터 3층까지 점점 좁아지는 대칭 탑을 완성해 보세요.',
    hint: '1층은 9칸, 2층은 십자(+) 모양 5칸, 3층은 정중앙 1칸입니다.',
    gridSize: 5,
    solutionCoords: fromHeightGrid([
      [0, 0, 0, 0, 0],
      [0, 1, 2, 1, 0],
      [0, 2, 3, 2, 0],
      [0, 1, 2, 1, 0],
      [0, 0, 0, 0, 0],
    ]),
  },

  // === 4. 숨은 쌓기나무 개수 맞히기 퀴즈 ===
  {
    id: 'quiz-1',
    type: 'count-quiz',
    difficulty: '기초',
    title: '숨은 나무를 찾아라! (1)',
    curriculumTag: '초6-2 · 쌓기나무 개수 세기',
    description: '마우스 우클릭 드래그로 입체를 이리저리 돌려 보며 총 몇 개의 쌓기나무가 쓰였는지 맞혀 보세요!',
    hint: '앞에서 보면 가려진 뒷줄 1층에 쌓기나무가 숨어 있어요. 우클릭 드래그로 뒤쪽을 살펴보거나 반투명 모드를 활용해 보세요.',
    gridSize: 5,
    solutionCoords: fromHeightGrid([
      [0, 0, 0, 0, 0],
      [0, 3, 2, 1, 0],
      [0, 2, 1, 1, 0],
      [0, 1, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]),
  },
  {
    id: 'quiz-2',
    type: 'count-quiz',
    difficulty: '도전',
    title: '숨은 나무를 찾아라! (2)',
    curriculumTag: '초6-2 · 쌓기나무 개수 세기',
    description: '복잡한 3층 구조에 숨어 있는 쌓기나무까지 빠짐없이 세어 총 개수를 입력해 보세요!',
    hint: '층별 보기(1층, 2층, 3층) 개수를 각각 더하거나, 위에서 본 모양 각 자리의 층수를 더해 보세요.',
    gridSize: 5,
    solutionCoords: fromHeightGrid([
      [0, 0, 0, 0, 0],
      [0, 3, 3, 2, 0],
      [0, 2, 2, 1, 0],
      [0, 2, 1, 0, 0],
      [0, 0, 0, 0, 0],
    ]),
  },
];
