import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Lightbulb,
  ChevronRight,
  Trophy,
  RotateCcw,
  HelpCircle,
} from 'lucide-react';
import type { BlockMap, Mission, MissionCheckResult } from '../types/blocks';
import { computeProjections, createBlockMap } from '../utils/projections';
import { MiniGrid } from './ProjectionPanels';

interface MissionPanelProps {
  missions: Mission[];
  currentMission: Mission;
  solvedIds: Set<string>;
  currentBlocks: BlockMap;
  checkResult: MissionCheckResult | null;
  onSelectMission: (mission: Mission) => void;
  onResetMission: () => void;
  onSubmitCountQuiz: (answer: number) => void;
  quizStatus: 'idle' | 'correct' | 'wrong';
  quizLastGuess: number | null;
}

const DIFF_BADGE: Record<Mission['difficulty'], string> = {
  기초: 'bg-emerald-100 text-emerald-800',
  보통: 'bg-sky-100 text-sky-800',
  도전: 'bg-purple-100 text-purple-800',
};

export const MissionPanel: React.FC<MissionPanelProps> = ({
  missions,
  currentMission,
  solvedIds,
  checkResult,
  onSelectMission,
  onResetMission,
  onSubmitCountQuiz,
  quizStatus,
  quizLastGuess,
}) => {
  const [showHint, setShowHint] = useState(false);
  const [quizInput, setQuizInput] = useState('');

  const targetProj = useMemo(() => {
    const map = createBlockMap(currentMission.solutionCoords);
    return computeProjections(map, currentMission.gridSize);
  }, [currentMission]);

  const currentIdx = missions.findIndex((m) => m.id === currentMission.id);
  const nextMission = missions[(currentIdx + 1) % missions.length];

  const isSolved =
    currentMission.type === 'count-quiz'
      ? quizStatus === 'correct'
      : Boolean(checkResult?.isSolved);

  const handleSelect = (m: Mission) => {
    setShowHint(false);
    setQuizInput('');
    onSelectMission(m);
  };

  const handleQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(quizInput, 10);
    if (!Number.isNaN(num) && num > 0) {
      onSubmitCountQuiz(num);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Mission Progress & Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            초6-2 교과 미션 ({solvedIds.size}/{missions.length})
          </span>
          <button
            type="button"
            onClick={onResetMission}
            className="text-[11px] font-semibold text-slate-500 hover:text-sky-600 flex items-center gap-1"
            title="현재 미션 작업 초기화"
          >
            <RotateCcw className="w-3 h-3" />
            다시 시작
          </button>
        </div>

        <div className="grid grid-cols-6 gap-1">
          {missions.map((m, idx) => {
            const active = m.id === currentMission.id;
            const done = solvedIds.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelect(m)}
                className={`py-1 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-0.5 ${
                  active
                    ? 'bg-sky-600 border-sky-600 text-white shadow-xs'
                    : done
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{idx + 1}</span>
                {done && <CheckCircle2 className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mission Brief Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              DIFF_BADGE[currentMission.difficulty]
            }`}
          >
            {currentMission.difficulty}
          </span>
          <span className="text-[11px] font-semibold text-indigo-600">
            {currentMission.curriculumTag}
          </span>
        </div>
        <h2 className="text-sm font-extrabold text-slate-800">{currentMission.title}</h2>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
          {currentMission.description}
        </p>

        <div className="mt-2.5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowHint((v) => !v)}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>{showHint ? '힌트 숨기기' : '힌트 보기'}</span>
          </button>

          {currentMission.type !== 'count-quiz' && checkResult && (
            <span className="text-xs font-bold text-slate-600">
              현재 쌓은 개수:{' '}
              <strong className="text-sky-700">{checkResult.currentCount}개</strong>
            </span>
          )}
        </div>

        {showHint && (
          <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            💡 {currentMission.hint}
          </div>
        )}
      </div>

      {/* Target Clues Area */}
      {currentMission.type === 'three-views' && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-xs font-extrabold text-slate-700 mb-2 flex items-center justify-between">
            <span>목표 모양 (앞 · 오른쪽 옆 · 위)</span>
            {currentMission.countGoal === 'min' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                목표: 최소 {checkResult?.minCount}개
              </span>
            )}
            {currentMission.countGoal === 'max' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                목표: 최대 {checkResult?.maxCount}개
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Target Front */}
            <div className="flex flex-col items-center p-1.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1 mb-1">
                {checkResult?.frontMatch ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-300" />
                )}
                <span className="text-[11px] font-bold text-sky-700">앞</span>
              </div>
              <MiniGrid
                gridSize={currentMission.gridSize}
                cells={targetProj.front}
                bottomUp={true}
                fillColorClass="bg-sky-500"
                compact={true}
              />
            </div>

            {/* Target Right Side */}
            <div className="flex flex-col items-center p-1.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1 mb-1">
                {checkResult?.sideMatch ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-300" />
                )}
                <span className="text-[11px] font-bold text-emerald-700">오른쪽 옆</span>
              </div>
              <MiniGrid
                gridSize={currentMission.gridSize}
                cells={targetProj.rightSide}
                bottomUp={true}
                fillColorClass="bg-emerald-500"
                compact={true}
              />
            </div>

            {/* Target Top */}
            <div className="flex flex-col items-center p-1.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1 mb-1">
                {checkResult?.topMatch ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-300" />
                )}
                <span className="text-[11px] font-bold text-amber-700">위</span>
              </div>
              <MiniGrid
                gridSize={currentMission.gridSize}
                cells={targetProj.topMask}
                bottomUp={false}
                fillColorClass="bg-amber-500"
                compact={true}
              />
              <span className="text-[9px] font-bold text-sky-600 mt-0.5">▲ 앞</span>
            </div>
          </div>
        </div>
      )}

      {currentMission.type === 'top-numbers' && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-amber-700">
              목표: 위에서 본 모양과 층수
            </span>
            {checkResult?.numbersMatch ? (
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 일치!
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-slate-400">진행 중</span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 mb-1">뒤</span>
          <MiniGrid
            gridSize={currentMission.gridSize}
            cells={targetProj.topMask}
            bottomUp={false}
            numbers={targetProj.topCounts}
            fillColorClass="bg-amber-500"
          />
          <span className="text-[10px] font-bold text-sky-600 mt-1">▲ 앞</span>
        </div>
      )}

      {currentMission.type === 'layers' && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-indigo-700">
              목표: 층별로 나타낸 모양
            </span>
            <span className="text-[10px] text-slate-400">아래쪽이 ▲ 앞</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: targetProj.maxLayer }, (_, y) => (
              <div
                key={y}
                className="flex flex-col items-center p-1.5 rounded-lg bg-slate-50 border border-slate-200"
              >
                <span className="text-[11px] font-extrabold text-indigo-700 mb-1">
                  {y + 1}층
                </span>
                <MiniGrid
                  gridSize={currentMission.gridSize}
                  cells={targetProj.layers[y]}
                  bottomUp={false}
                  fillColorClass="bg-indigo-500"
                  compact={true}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {currentMission.type === 'count-quiz' && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 mb-2">
            <HelpCircle className="w-4 h-4 text-sky-600" />
            <span>총 쌓기나무 개수를 입력해 보세요</span>
          </div>
          <form onSubmit={handleQuizSubmit} className="flex gap-2">
            <input
              type="number"
              min={1}
              max={125}
              value={quizInput}
              onChange={(e) => setQuizInput(e.target.value)}
              placeholder="예: 12"
              className="flex-1 px-3 py-2 text-sm font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors"
            >
              정답 확인
            </button>
          </form>

          {quizStatus === 'wrong' && quizLastGuess !== null && (
            <p className="mt-2 text-xs font-semibold text-rose-600">
              {quizLastGuess}개는 조금 달라요! 우클릭 드래그로 뒷면까지 꼼꼼히 세어 보세요.
            </p>
          )}

          {quizStatus === 'correct' && (
            <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex flex-col items-center">
              <p className="text-xs font-extrabold text-emerald-800 mb-2">
                🎉 정답! 총 {targetProj.totalCount}개의 쌓기나무예요! (위에서 본 숫자표 확인)
              </p>
              <MiniGrid
                gridSize={currentMission.gridSize}
                cells={targetProj.topMask}
                bottomUp={false}
                numbers={targetProj.topCounts}
                fillColorClass="bg-emerald-500"
                compact={true}
              />
            </div>
          )}
        </div>
      )}

      {/* Live Status / Celebration Banner */}
      {isSolved ? (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
            <Trophy className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>미션 성공!</span>
          </div>
          {checkResult && currentMission.type !== 'count-quiz' && (
            <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
              {checkResult.feedback}
            </p>
          )}
          <button
            type="button"
            onClick={() => handleSelect(nextMission)}
            className="mt-2.5 w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors"
          >
            <span>다음 미션으로 ({nextMission.title})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        checkResult &&
        currentMission.type !== 'count-quiz' && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-600 leading-relaxed">
            {checkResult.feedback}
          </div>
        )
      )}
    </div>
  );
};
