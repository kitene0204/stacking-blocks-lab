import type {
  BlockCoord,
  BlockMap,
  Mission,
  MissionCheckResult,
  ProjectionResult,
} from '../types/blocks';

export function coordKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

export function parseKey(key: string): BlockCoord {
  const [x, y, z] = key.split(',').map(Number);
  return { x, y, z };
}

export function createBlockMap(coords: BlockCoord[], color = '#e8b97d'): BlockMap {
  const map: BlockMap = {};
  for (const c of coords) {
    map[coordKey(c.x, c.y, c.z)] = { ...c, color };
  }
  return map;
}

export function computeProjections(blocks: BlockMap, gridSize: number): ProjectionResult {
  const front = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
  const rightSide = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
  const leftSide = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
  const topMask = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
  const topCounts = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));
  const layers = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => Array(gridSize).fill(false))
  );

  let maxLayer = 0;
  let hasFloatingBlocks = false;
  const entries = Object.values(blocks);

  for (const b of entries) {
    if (
      b.x < 0 || b.x >= gridSize ||
      b.y < 0 || b.y >= gridSize ||
      b.z < 0 || b.z >= gridSize
    ) {
      continue;
    }

    front[b.y][b.x] = true;
    // Right side (+X looking toward -X): left column is Front (z = gridSize - 1), right column is Back (z = 0)
    rightSide[b.y][gridSize - 1 - b.z] = true;
    // Left side (-X looking toward +X): left column is Back (z = 0), right column is Front (z = gridSize - 1)
    leftSide[b.y][b.z] = true;

    topMask[b.z][b.x] = true;
    topCounts[b.z][b.x] += 1;
    layers[b.y][b.z][b.x] = true;

    if (b.y + 1 > maxLayer) {
      maxLayer = b.y + 1;
    }

    if (b.y > 0 && !blocks[coordKey(b.x, b.y - 1, b.z)]) {
      hasFloatingBlocks = true;
    }
  }

  return {
    front,
    rightSide,
    leftSide,
    topMask,
    topCounts,
    layers,
    maxLayer,
    hasFloatingBlocks,
    totalCount: entries.length,
  };
}

/**
 * Given valid stacked (no-floating) Front, Right-Side, and Top-Mask views,
 * calculates the exact minimum and maximum number of blocks that can produce
 * the exact same three views under elementary math textbook stacking rules.
 */
export function computeMinMaxBlocks(
  front: boolean[][],
  rightSide: boolean[][],
  topMask: boolean[][],
  gridSize: number
): { minCount: number; maxCount: number } {
  const frontHeights = Array(gridSize).fill(0);
  const sideHeights = Array(gridSize).fill(0); // indexed by z (0..gridSize-1)

  for (let x = 0; x < gridSize; x++) {
    for (let y = gridSize - 1; y >= 0; y--) {
      if (front[y][x]) {
        frontHeights[x] = y + 1;
        break;
      }
    }
  }

  for (let z = 0; z < gridSize; z++) {
    const col = gridSize - 1 - z;
    for (let y = gridSize - 1; y >= 0; y--) {
      if (rightSide[y][col]) {
        sideHeights[z] = y + 1;
        break;
      }
    }
  }

  // Max count: each occupied cell (x, z) gets min(frontHeights[x], sideHeights[z])
  const activeCells: Array<{ x: number; z: number; maxH: number }> = [];
  let maxCount = 0;

  for (let z = 0; z < gridSize; z++) {
    for (let x = 0; x < gridSize; x++) {
      if (topMask[z][x]) {
        const maxH = Math.min(frontHeights[x], sideHeights[z]);
        activeCells.push({ x, z, maxH });
        maxCount += maxH;
      }
    }
  }

  if (activeCells.length === 0) {
    return { minCount: 0, maxCount: 0 };
  }

  // Exact minimum via branch-and-bound over required front/side peaks > 1.
  // Baseline: every active cell must have height >= 1.
  const baseCount = activeCells.length;

  interface Constraint {
    kind: 'front' | 'side';
    index: number;
    targetH: number;
  }

  const constraints: Constraint[] = [];
  for (let x = 0; x < gridSize; x++) {
    if (frontHeights[x] > 1) {
      constraints.push({ kind: 'front', index: x, targetH: frontHeights[x] });
    }
  }
  for (let z = 0; z < gridSize; z++) {
    if (sideHeights[z] > 1) {
      constraints.push({ kind: 'side', index: z, targetH: sideHeights[z] });
    }
  }

  // Sort constraints descending by targetH so tighter constraints are resolved first
  constraints.sort((a, b) => b.targetH - a.targetH);

  // Assigned height per cell (initially 1)
  const cellHeight = activeCells.map(() => 1);
  let bestExtra = maxCount - baseCount;

  function isSatisfied(c: Constraint): boolean {
    for (let i = 0; i < activeCells.length; i++) {
      const cell = activeCells[i];
      if (c.kind === 'front' && cell.x === c.index && cellHeight[i] === c.targetH) return true;
      if (c.kind === 'side' && cell.z === c.index && cellHeight[i] === c.targetH) return true;
    }
    return false;
  }

  function search(idx: number, currentExtra: number) {
    if (currentExtra >= bestExtra) return;

    // Skip already satisfied constraints
    while (idx < constraints.length && isSatisfied(constraints[idx])) {
      idx++;
    }

    if (idx === constraints.length) {
      bestExtra = currentExtra;
      return;
    }

    const c = constraints[idx];
    // Try assigning targetH to each eligible cell in this row/col
    // Prioritize cells that can satisfy BOTH front and side simultaneously
    const candidates: number[] = [];
    for (let i = 0; i < activeCells.length; i++) {
      const cell = activeCells[i];
      const matchesLine =
        (c.kind === 'front' && cell.x === c.index) ||
        (c.kind === 'side' && cell.z === c.index);
      if (matchesLine && cell.maxH >= c.targetH && cellHeight[i] < c.targetH) {
        candidates.push(i);
      }
    }

    // Sort candidates: prefer cells where frontHeights[x] === sideHeights[z] === c.targetH
    candidates.sort((a, b) => {
      const ca = activeCells[a];
      const cb = activeCells[b];
      const dualA = frontHeights[ca.x] === c.targetH && sideHeights[ca.z] === c.targetH ? 0 : 1;
      const dualB = frontHeights[cb.x] === c.targetH && sideHeights[cb.z] === c.targetH ? 0 : 1;
      return dualA - dualB;
    });

    for (const i of candidates) {
      const prev = cellHeight[i];
      const delta = c.targetH - prev;
      if (currentExtra + delta >= bestExtra) continue;
      cellHeight[i] = c.targetH;
      search(idx + 1, currentExtra + delta);
      cellHeight[i] = prev;
    }
  }

  search(0, 0);

  return {
    minCount: baseCount + bestExtra,
    maxCount,
  };
}

export function gridsEqualBool(a: boolean[][], b: boolean[][]): boolean {
  if (a.length !== b.length) return false;
  for (let r = 0; r < a.length; r++) {
    if (a[r].length !== b[r].length) return false;
    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

export function gridsEqualNum(a: number[][], b: number[][]): boolean {
  if (a.length !== b.length) return false;
  for (let r = 0; r < a.length; r++) {
    if (a[r].length !== b[r].length) return false;
    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

export function checkMissionResult(
  currentBlocks: BlockMap,
  mission: Mission
): MissionCheckResult {
  const targetMap = createBlockMap(mission.solutionCoords);
  const targetProj = computeProjections(targetMap, mission.gridSize);
  const curProj = computeProjections(currentBlocks, mission.gridSize);

  const frontMatch = gridsEqualBool(curProj.front, targetProj.front);
  const sideMatch = gridsEqualBool(curProj.rightSide, targetProj.rightSide);
  const topMatch = gridsEqualBool(curProj.topMask, targetProj.topMask);
  const numbersMatch = gridsEqualNum(curProj.topCounts, targetProj.topCounts);
  const noFloating = !curProj.hasFloatingBlocks;

  let layersMatch = true;
  for (let y = 0; y < mission.gridSize; y++) {
    if (!gridsEqualBool(curProj.layers[y], targetProj.layers[y])) {
      layersMatch = false;
      break;
    }
  }

  const { minCount, maxCount } = computeMinMaxBlocks(
    targetProj.front,
    targetProj.rightSide,
    targetProj.topMask,
    mission.gridSize
  );

  let countGoalMet = true;
  if (mission.type === 'three-views') {
    if (mission.countGoal === 'min') {
      countGoalMet = curProj.totalCount === minCount;
    } else if (mission.countGoal === 'max') {
      countGoalMet = curProj.totalCount === maxCount;
    }
  }

  let isSolved = false;
  let feedback = '';

  if (mission.type === 'three-views') {
    const viewsOk = frontMatch && sideMatch && topMatch && noFloating;
    isSolved = viewsOk && countGoalMet;

    if (!noFloating) {
      feedback = '공중에 떠 있는 쌓기나무가 있어요! 아래에 받침을 쌓아 주세요.';
    } else if (!viewsOk) {
      const missing: string[] = [];
      if (!frontMatch) missing.push('앞');
      if (!sideMatch) missing.push('오른쪽 옆');
      if (!topMatch) missing.push('위');
      feedback = `${missing.join(', ')}에서 본 모양을 다시 확인해 보세요.`;
    } else if (!countGoalMet) {
      if (mission.countGoal === 'min') {
        feedback = `앞·옆·위 모양은 완벽해요! 이제 숨은 나무를 빼서 가장 적은 개수(${minCount}개)로 만들어 보세요. (현재 ${curProj.totalCount}개)`;
      } else {
        feedback = `앞·옆·위 모양은 완벽해요! 숨은 자리에 나무를 더 쌓아 가장 많은 개수(${maxCount}개)로 만들어 보세요. (현재 ${curProj.totalCount}개)`;
      }
    } else {
      if (minCount !== maxCount) {
        feedback = `정답입니다! (이 삼면도는 최소 ${minCount}개 ~ 최대 ${maxCount}개로 만들 수 있어요. 현재 ${curProj.totalCount}개)`;
      } else {
        feedback = `정답입니다! 모든 방향에서 본 모양이 완벽하게 일치해요.`;
      }
    }
  } else if (mission.type === 'top-numbers') {
    isSolved = numbersMatch && noFloating;
    if (!noFloating) {
      feedback = '공중에 뜬 쌓기나무가 있어요. 바닥부터 차곡차곡 쌓아 주세요.';
    } else if (!isSolved) {
      feedback = '위에서 본 모양의 각 칸에 적힌 층수(숫자)에 맞게 쌓아 보세요.';
    } else {
      feedback = '정답입니다! 숫자표에 적힌 높이대로 정확하게 쌓았어요.';
    }
  } else if (mission.type === 'layers') {
    isSolved = layersMatch && noFloating;
    if (!noFloating) {
      feedback = '공중에 뜬 쌓기나무가 있어요. 1층부터 차곡차곡 확인해 보세요.';
    } else if (!isSolved) {
      feedback = '1층, 2층, 3층 모양을 하나씩 비교해 보세요.';
    } else {
      feedback = '정답입니다! 층별 단면 모양과 정확히 일치해요.';
    }
  }

  return {
    isSolved,
    frontMatch,
    sideMatch,
    topMatch,
    numbersMatch,
    layersMatch,
    noFloating,
    countGoalMet,
    currentCount: curProj.totalCount,
    minCount,
    maxCount,
    feedback,
  };
}

/**
 * Compact URL-safe encoding for sharing block structures:
 * format: "{gridSize}:{x}{y}{z}{colorIdx}..."
 */
export function encodeBlocksToCode(blocks: BlockMap, gridSize: number, paletteHexes: readonly string[]): string {
  const entries = Object.values(blocks);
  const parts = entries.map((b) => {
    const ci = Math.max(0, paletteHexes.indexOf(b.color));
    return `${b.x}${b.y}${b.z}${ci}`;
  });
  return `${gridSize}-${parts.join('')}`;
}

export function decodeBlocksFromCode(
  code: string,
  paletteHexes: readonly string[]
): { gridSize: number; blocks: BlockMap } | null {
  try {
    const cleaned = code.trim();
    const dashIdx = cleaned.indexOf('-');
    if (dashIdx === -1) return null;
    const gridSize = Number(cleaned.slice(0, dashIdx));
    if (!Number.isInteger(gridSize) || gridSize < 3 || gridSize > 7) return null;
    const payload = cleaned.slice(dashIdx + 1);
    if (payload.length % 4 !== 0) return null;

    const blocks: BlockMap = {};
    for (let i = 0; i < payload.length; i += 4) {
      const x = Number(payload[i]);
      const y = Number(payload[i + 1]);
      const z = Number(payload[i + 2]);
      const ci = Number(payload[i + 3]);
      if (
        Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z) ||
        x < 0 || x >= gridSize || y < 0 || y >= gridSize || z < 0 || z >= gridSize
      ) {
        return null;
      }
      const color = paletteHexes[ci] ?? paletteHexes[0];
      blocks[coordKey(x, y, z)] = { x, y, z, color };
    }
    return { gridSize, blocks };
  } catch {
    return null;
  }
}
