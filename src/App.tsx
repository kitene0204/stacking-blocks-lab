import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Blocks,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Eye,
  ArrowDownToLine,
  Palette,
  Volume2,
  VolumeX,
  HelpCircle,
  Share2,
  Compass,
  GraduationCap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type {
  AppMode,
  BlockCoord,
  BlockMap,
  CameraAngles,
  CameraPreset,
  Mission,
  ProjectionType,
  SideViewDirection,
  ToolMode,
} from './types/blocks';
import { BLOCK_PALETTE } from './types/blocks';
import {
  checkMissionResult,
  computeProjections,
  coordKey,
  createBlockMap,
  decodeBlocksFromCode,
  encodeBlocksToCode,
} from './utils/projections';
import { soundFx } from './utils/sound';
import { MISSIONS } from './data/missions';
import { Viewport3D } from './components/Viewport3D';
import { ViewCube } from './components/ViewCube';
import { ProjectionPanels } from './components/ProjectionPanels';
import { MissionPanel } from './components/MissionPanel';
import { HelpModal, ShareModal } from './components/Modals';

const STARTER_COORDS: BlockCoord[] = [
  { x: 1, y: 0, z: 1 },
  { x: 1, y: 1, z: 1 },
  { x: 1, y: 2, z: 1 },
  { x: 2, y: 0, z: 1 },
  { x: 2, y: 1, z: 1 },
  { x: 3, y: 0, z: 1 },
  { x: 1, y: 0, z: 2 },
  { x: 2, y: 0, z: 2 },
];

const PALETTE_HEXES = BLOCK_PALETTE.map((p) => p.hex);

export function App() {
  // App mode & grid
  const [appMode, setAppMode] = useState<AppMode>('sandbox');
  const [gridSize, setGridSize] = useState<number>(5);

  // Blocks + Undo/Redo history
  const [blocks, setBlocks] = useState<BlockMap>(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#code=')) {
      const decoded = decodeBlocksFromCode(hash.slice(6), PALETTE_HEXES);
      if (decoded) return decoded.blocks;
    }
    return createBlockMap(STARTER_COORDS, BLOCK_PALETTE[0].hex);
  });
  const [past, setPast] = useState<BlockMap[]>([]);
  const [future, setFuture] = useState<BlockMap[]>([]);

  // Tool & visual settings
  const [toolMode, setToolMode] = useState<ToolMode>('build');
  const [shiftHeld, setShiftHeld] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>(BLOCK_PALETTE[0].hex);
  const [layerColorMode, setLayerColorMode] = useState(false);
  const [xrayMode, setXrayMode] = useState(false);
  const [gravityEnabled, setGravityEnabled] = useState(true);
  const [shortRightClickErase, setShortRightClickErase] = useState(false);
  const [muted, setMuted] = useState(false);

  // Projection panel settings
  const [sideDirection, setSideDirection] = useState<SideViewDirection>('right');
  const [showTopNumbers, setShowTopNumbers] = useState(true);
  const [hideProjections, setHideProjections] = useState(false);
  const [highlightLayer, setHighlightLayer] = useState<number | null>(null);
  const [showLiveInMission, setShowLiveInMission] = useState(true);

  // Camera & ViewCube state
  const [cameraAngles, setCameraAngles] = useState<CameraAngles>({
    theta: Math.PI * 0.22,
    phi: Math.PI * 0.34,
  });
  const [projectionType, setProjectionType] = useState<ProjectionType>('perspective');
  const [cameraPresetTrigger, setCameraPresetTrigger] = useState<{
    preset: CameraPreset;
    seq: number;
  } | null>(null);

  // Mission state
  const [currentMission, setCurrentMission] = useState<Mission>(MISSIONS[0]);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(() => new Set());
  const [quizStatus, setQuizStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [quizLastGuess, setQuizLastGuess] = useState<number | null>(null);

  // Modals & toast
  const [helpOpen, setHelpOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Sync gridSize if loaded from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#code=')) {
      const decoded = decodeBlocksFromCode(hash.slice(6), PALETTE_HEXES);
      if (decoded) {
        setGridSize(decoded.gridSize);
      }
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const snapCamera = useCallback((preset: CameraPreset) => {
    setCameraPresetTrigger((prev) => ({ preset, seq: (prev?.seq ?? 0) + 1 }));
  }, []);

  const commitBlocks = useCallback((next: BlockMap) => {
    setBlocks((prev) => {
      setPast((p) => [...p.slice(-49), prev]);
      setFuture([]);
      return next;
    });
  }, []);

  const handlePlaceBlock = useCallback(
    (coord: BlockCoord) => {
      const key = coordKey(coord.x, coord.y, coord.z);
      if (blocks[key]) return;
      const next: BlockMap = {
        ...blocks,
        [key]: { ...coord, color: selectedColor },
      };
      commitBlocks(next);
      soundFx.playPlace(coord.y);
    },
    [blocks, selectedColor, commitBlocks]
  );

  const handleRemoveBlock = useCallback(
    (coord: BlockCoord) => {
      const key = coordKey(coord.x, coord.y, coord.z);
      if (!blocks[key]) return;

      const next: BlockMap = { ...blocks };
      delete next[key];

      // Under gravity mode, drop blocks directly above down by 1 so no floating blocks occur
      if (gravityEnabled) {
        for (let y = coord.y + 1; y < gridSize; y++) {
          const upperKey = coordKey(coord.x, y, coord.z);
          if (next[upperKey]) {
            const lowerKey = coordKey(coord.x, y - 1, coord.z);
            next[lowerKey] = { ...next[upperKey], y: y - 1 };
            delete next[upperKey];
          }
        }
      }

      commitBlocks(next);
      soundFx.playRemove();
    },
    [blocks, gravityEnabled, gridSize, commitBlocks]
  );

  const handleBlockedAction = useCallback(
    (msg: string) => {
      soundFx.playBlocked();
      showToast(msg);
    },
    [showToast]
  );

  const handleUndo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [blocks, ...f]);
    setBlocks(previous);
    soundFx.playRemove();
  }, [past, blocks]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, blocks]);
    setBlocks(next);
    soundFx.playPlace(1);
  }, [future, blocks]);

  const handleClear = useCallback(() => {
    if (Object.keys(blocks).length === 0) return;
    commitBlocks({});
    soundFx.playRemove();
  }, [blocks, commitBlocks]);

  // Mission switching
  const loadMission = useCallback(
    (mission: Mission) => {
      setCurrentMission(mission);
      setGridSize(mission.gridSize);
      setPast([]);
      setFuture([]);
      setQuizStatus('idle');
      setQuizLastGuess(null);
      setHighlightLayer(null);

      if (mission.type === 'count-quiz') {
        setBlocks(createBlockMap(mission.solutionCoords, BLOCK_PALETTE[0].hex));
        setHideProjections(true);
      } else {
        setBlocks({});
        setGravityEnabled(true);
        setHideProjections(false);
      }
      snapCamera('home');
    },
    [snapCamera]
  );

  // Preserve sandbox blocks when switching to mission mode and back
  const savedSandboxRef = useRef<{ blocks: BlockMap; gridSize: number } | null>(null);

  const handleSwitchAppMode = useCallback(
    (mode: AppMode) => {
      if (mode === appMode) return;
      setAppMode(mode);
      if (mode === 'mission') {
        savedSandboxRef.current = { blocks, gridSize };
        loadMission(currentMission);
      } else {
        setHideProjections(false);
        setHighlightLayer(null);
        setPast([]);
        setFuture([]);
        if (savedSandboxRef.current) {
          setGridSize(savedSandboxRef.current.gridSize);
          setBlocks(savedSandboxRef.current.blocks);
        } else {
          setBlocks(createBlockMap(STARTER_COORDS, BLOCK_PALETTE[0].hex));
        }
      }
    },
    [appMode, blocks, gridSize, currentMission, loadMission]
  );

  // Live projections
  const projections = useMemo(
    () => computeProjections(blocks, gridSize),
    [blocks, gridSize]
  );

  // Live mission evaluation
  const missionCheck = useMemo(() => {
    if (appMode !== 'mission' || currentMission.type === 'count-quiz') return null;
    return checkMissionResult(blocks, currentMission);
  }, [appMode, blocks, currentMission]);

  // Mark mission solved & play fanfare once
  useEffect(() => {
    if (
      appMode === 'mission' &&
      missionCheck?.isSolved &&
      !solvedIds.has(currentMission.id)
    ) {
      setSolvedIds((prev) => new Set(prev).add(currentMission.id));
      soundFx.playSuccess();
    }
  }, [appMode, missionCheck, currentMission.id, solvedIds]);

  const handleSubmitCountQuiz = useCallback(
    (guess: number) => {
      setQuizLastGuess(guess);
      const answer = currentMission.solutionCoords.length;
      if (guess === answer) {
        setQuizStatus('correct');
        if (!solvedIds.has(currentMission.id)) {
          setSolvedIds((prev) => new Set(prev).add(currentMission.id));
        }
        soundFx.playSuccess();
      } else {
        setQuizStatus('wrong');
        soundFx.playBlocked();
      }
    },
    [currentMission, solvedIds]
  );

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundFx.muted = next;
      return next;
    });
  }, []);

  const handleImportCode = useCallback(
    (code: string) => {
      const decoded = decodeBlocksFromCode(code, PALETTE_HEXES);
      if (!decoded) return false;
      setAppMode('sandbox');
      setGridSize(decoded.gridSize);
      commitBlocks(decoded.blocks);
      showToast('공유된 쌓기나무 모양을 불러왔어요!');
      snapCamera('home');
      return true;
    },
    [commitBlocks, showToast, snapCamera]
  );

  const handleChangeGridSize = useCallback(
    (nextSize: number) => {
      if (nextSize === gridSize) return;
      setGridSize(nextSize);
      // Filter out any blocks outside new grid bounds
      const filtered: BlockMap = {};
      for (const [k, b] of Object.entries(blocks)) {
        if (b.x < nextSize && b.y < nextSize && b.z < nextSize) {
          filtered[k] = b;
        }
      }
      commitBlocks(filtered);
      snapCamera('home');
    },
    [gridSize, blocks, commitBlocks, snapCamera]
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'b':
          setToolMode('build');
          break;
        case 'e':
          setToolMode('erase');
          break;
        case 'h':
          snapCamera('home');
          break;
        case '1':
          snapCamera('front');
          break;
        case '2':
          snapCamera('right');
          break;
        case '3':
          snapCamera('top');
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo, snapCamera]);

  const isReadOnly = appMode === 'mission' && currentMission.type === 'count-quiz';
  const effectiveErase = toolMode === 'erase' || shiftHeld;
  const shareCode = useMemo(
    () => encodeBlocksToCode(blocks, gridSize, PALETTE_HEXES),
    [blocks, gridSize]
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-14 shrink-0 bg-white border-b border-slate-200 px-3 sm:px-4 flex items-center justify-between gap-2 z-20 shadow-2xs">
        {/* Brand + Mode Switcher */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Blocks className="w-4.5 h-4.5" />
            </div>
            <div className="hidden sm:block leading-tight">
              <h1 className="text-sm font-extrabold text-slate-800 tracking-tight">
                쌓기나무 랩
              </h1>
              <p className="text-[10px] font-semibold text-sky-600">
                초6-2 수학 · 공간과 입체
              </p>
            </div>
          </div>

          {/* App Mode Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => handleSwitchAppMode('sandbox')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                appMode === 'sandbox'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>자유 탐구</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchAppMode('mission')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                appMode === 'mission'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>교과 미션</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-700">
                {solvedIds.size}/{MISSIONS.length}
              </span>
            </button>
          </div>
        </div>

        {/* Center Build / Erase & Undo / Redo Toolbar */}
        <div className="flex items-center gap-1.5">
          {!isReadOnly && (
            <>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setToolMode('build')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    !effectiveErase
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                  title="쌓기 모드 (단축키 B)"
                >
                  <Blocks className="w-3.5 h-3.5" />
                  <span>쌓기</span>
                </button>
                <button
                  type="button"
                  onClick={() => setToolMode('erase')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    effectiveErase
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                  title="빼기(지우개) 모드 (단축키 E 또는 Shift 누르고 좌클릭)"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>{shiftHeld && toolMode === 'build' ? 'Shift 빼기' : '빼기'}</span>
                </button>
              </div>

              <div className="h-5 w-px bg-slate-200 mx-0.5 hidden md:block" />

              <button
                type="button"
                onClick={handleUndo}
                disabled={past.length === 0}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
                title="실행 취소 (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={future.length === 0}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
                title="다시 실행 (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={Object.keys(blocks).length === 0}
                className="p-2 rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
                title="작업평면 모두 비우기"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Right Utility Actions */}
        <div className="flex items-center gap-1">
          {appMode === 'sandbox' && (
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              title="내 쌓기나무 모양 공유/불러오기"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">공유</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleMute}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            title={muted ? '효과음 켜기' : '효과음 끄기'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 transition-colors"
            title="틴커캐드 마우스 조작법 및 단축키 보기"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden sm:inline">조작 안내</span>
          </button>
        </div>
      </header>

      {/* Main Split Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left / Center 3D Tinkercad Viewport */}
        <main className="flex-1 relative min-w-0 bg-slate-100">
          <Viewport3D
            blocks={blocks}
            gridSize={gridSize}
            toolMode={toolMode}
            selectedColor={selectedColor}
            layerColorMode={layerColorMode}
            xrayMode={xrayMode}
            gravityEnabled={gravityEnabled}
            shortRightClickErase={shortRightClickErase}
            readOnly={isReadOnly}
            highlightLayer={highlightLayer}
            projectionType={projectionType}
            cameraPresetTrigger={cameraPresetTrigger}
            onPlaceBlock={handlePlaceBlock}
            onRemoveBlock={handleRemoveBlock}
            onBlockedAction={handleBlockedAction}
            onCameraAngleChange={setCameraAngles}
            onShiftStateChange={setShiftHeld}
          />

          {/* Top-Left Tinkercad ViewCube & Camera Controls */}
          <div className="absolute top-4 left-4 z-10">
            <ViewCube
              angles={cameraAngles}
              projectionType={projectionType}
              onSelectPreset={snapCamera}
              onToggleProjection={() =>
                setProjectionType((p) =>
                  p === 'perspective' ? 'orthographic' : 'perspective'
                )
              }
            />
          </div>

          {/* Read-only quiz badge */}
          {isReadOnly && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-indigo-600/95 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
              🔍 관찰 모드 — 우클릭 드래그로 돌려 보며 개수를 세어 보세요!
            </div>
          )}

          {/* Toast Alert */}
          {toast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/90 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
              {toast}
            </div>
          )}

          {/* Bottom-Left Visual & Physics Controls Dock */}
          <div className="absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-2 max-w-[calc(100%-2rem)]">
            {/* Color Palette */}
            {!isReadOnly && (
              <div className="flex items-center gap-1.5 bg-white/92 backdrop-blur-sm px-2.5 py-1.5 rounded-xl shadow-md border border-slate-200/90">
                {BLOCK_PALETTE.map((swatch) => {
                  const active = !layerColorMode && selectedColor === swatch.hex;
                  return (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => {
                        setLayerColorMode(false);
                        setSelectedColor(swatch.hex);
                      }}
                      className={`w-5 h-5 rounded-full border-2 transition-transform ${
                        active
                          ? 'border-slate-800 scale-115 shadow-xs'
                          : 'border-white hover:scale-110'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                      title={swatch.name}
                    />
                  );
                })}
              </div>
            )}

            {/* Toggle Pills */}
            <div className="flex items-center gap-1.5 bg-white/92 backdrop-blur-sm p-1.5 rounded-xl shadow-md border border-slate-200/90">
              <button
                type="button"
                onClick={() => setLayerColorMode((v) => !v)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  layerColorMode
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="1층, 2층, 3층을 서로 다른 색으로 표시해 높이를 쉽게 구분합니다"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>층별 색상</span>
              </button>

              <button
                type="button"
                onClick={() => setXrayMode((v) => !v)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  xrayMode
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="쌓기나무를 반투명하게 만들어 뒤에 숨은 쌓기나무를 확인합니다"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>반투명</span>
              </button>

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setGravityEnabled((v) => !v)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    gravityEnabled
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="교과서 쌓기나무 규칙: 바닥부터 차곡차곡 쌓기 (끄면 공중 배치 가능)"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>중력 규칙</span>
                </button>
              )}

              {appMode === 'sandbox' && (
                <>
                  <div className="h-4 w-px bg-slate-200 mx-0.5" />
                  <select
                    value={gridSize}
                    onChange={(e) => handleChangeGridSize(Number(e.target.value))}
                    className="text-xs font-bold text-slate-700 bg-slate-100 rounded-lg px-2 py-1 border-none focus:outline-none cursor-pointer"
                    title="작업평면 격자 크기 선택"
                  >
                    <option value={5}>5×5 판</option>
                    <option value={6}>6×6 판</option>
                    <option value={7}>7×7 판</option>
                  </select>
                </>
              )}
            </div>
          </div>

          {/* Bottom-Right Subtle Tinkercad Mouse Guide Pill */}
          <div className="hidden xl:flex absolute bottom-4 right-4 z-10 items-center gap-2 bg-white/85 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-slate-200/80 text-[11px] font-medium text-slate-600 pointer-events-none">
            <span><strong className="text-sky-700">좌클릭</strong> 쌓기</span>
            <span className="text-slate-300">|</span>
            <span><strong className="text-rose-600">Shift+좌클릭</strong> 빼기</span>
            <span className="text-slate-300">|</span>
            <span><strong className="text-slate-800">우클릭 드래그</strong> 회전</span>
            <span className="text-slate-300">|</span>
            <span><strong className="text-slate-800">휠 클릭 드래그</strong> 이동</span>
            <span className="text-slate-300">|</span>
            <span><strong className="text-slate-800">휠</strong> 확대/축소</span>
          </div>
        </main>

        {/* Right Sidebar: Real-time Projections & Curriculum Missions */}
        <aside className="w-[348px] lg:w-[376px] shrink-0 bg-slate-50/95 border-l border-slate-200 overflow-y-auto p-3.5 flex flex-col gap-3 z-10">
          {appMode === 'sandbox' ? (
            <ProjectionPanels
              projections={projections}
              gridSize={gridSize}
              sideDirection={sideDirection}
              onChangeSideDirection={setSideDirection}
              showTopNumbers={showTopNumbers}
              onToggleTopNumbers={() => setShowTopNumbers((v) => !v)}
              hideProjections={hideProjections}
              onToggleHideProjections={() => setHideProjections((v) => !v)}
              highlightLayer={highlightLayer}
              onHighlightLayer={setHighlightLayer}
              onSnapCamera={snapCamera}
            />
          ) : (
            <>
              <MissionPanel
                missions={MISSIONS}
                currentMission={currentMission}
                solvedIds={solvedIds}
                currentBlocks={blocks}
                checkResult={missionCheck}
                onSelectMission={loadMission}
                onResetMission={() => loadMission(currentMission)}
                onSubmitCountQuiz={handleSubmitCountQuiz}
                quizStatus={quizStatus}
                quizLastGuess={quizLastGuess}
              />

              {/* Live Self-Check Projection Panel in Mission Mode */}
              <div className="border-t border-slate-200 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLiveInMission((v) => !v)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-extrabold text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  <span>내 쌓기나무 실시간 관찰 (앞·옆·위)</span>
                  {showLiveInMission ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {showLiveInMission && (
                  <div className="mt-2">
                    <ProjectionPanels
                      projections={projections}
                      gridSize={gridSize}
                      sideDirection={sideDirection}
                      onChangeSideDirection={setSideDirection}
                      showTopNumbers={showTopNumbers}
                      onToggleTopNumbers={() => setShowTopNumbers((v) => !v)}
                      hideProjections={hideProjections}
                      onToggleHideProjections={() => setHideProjections((v) => !v)}
                      highlightLayer={highlightLayer}
                      onHighlightLayer={setHighlightLayer}
                      onSnapCamera={snapCamera}
                      hideCount={isReadOnly && quizStatus !== 'correct'}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Modals */}
      <HelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        shortRightClickErase={shortRightClickErase}
        onToggleShortRightClickErase={() => setShortRightClickErase((v) => !v)}
      />

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        shareCode={shareCode}
        onImportCode={handleImportCode}
      />
    </div>
  );
}

export default App;
