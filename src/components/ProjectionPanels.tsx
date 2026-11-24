import React from 'react';
import { Eye, EyeOff, Layers, Sparkles, AlertTriangle } from 'lucide-react';
import type {
  CameraPreset,
  ProjectionResult,
  SideViewDirection,
} from '../types/blocks';
import { LAYER_COLORS } from '../types/blocks';
import { computeMinMaxBlocks } from '../utils/projections';

interface MiniGridProps {
  gridSize: number;
  cells: boolean[][];
  /** If true, row 0 is rendered at the BOTTOM (Front/Side views). If false, row 0 is at the TOP (Top/Layer views). */
  bottomUp?: boolean;
  numbers?: number[][];
  fillColorClass: string;
  compact?: boolean;
}

export const MiniGrid: React.FC<MiniGridProps> = ({
  gridSize,
  cells,
  bottomUp = false,
  numbers,
  fillColorClass,
  compact = false,
}) => {
  const rowIndices = bottomUp
    ? Array.from({ length: gridSize }, (_, i) => gridSize - 1 - i)
    : Array.from({ length: gridSize }, (_, i) => i);

  return (
    <div
      className="grid gap-[2px] bg-slate-200/90 p-[3px] rounded-lg border border-slate-300/80 mx-auto w-full"
      style={{
        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
        maxWidth: compact ? '96px' : `${Math.min(gridSize * 24 + 8, 136)}px`,
      }}
    >
      {rowIndices.map((r) =>
        Array.from({ length: gridSize }, (_, c) => {
          const active = cells[r]?.[c] ?? false;
          const num = numbers?.[r]?.[c] ?? 0;
          return (
            <div
              key={`${r}-${c}`}
              className={`aspect-square rounded-[2px] flex items-center justify-center font-extrabold transition-colors leading-none ${
                compact ? 'text-[9px]' : 'text-[11px]'
              } ${
                active
                  ? `${fillColorClass} text-white shadow-xs`
                  : 'bg-white/95 text-transparent'
              }`}
            >
              {numbers && num > 0 ? num : ''}
            </div>
          );
        })
      )}
    </div>
  );
};

interface ProjectionPanelsProps {
  projections: ProjectionResult;
  gridSize: number;
  sideDirection: SideViewDirection;
  onChangeSideDirection: (dir: SideViewDirection) => void;
  showTopNumbers: boolean;
  onToggleTopNumbers: () => void;
  hideProjections: boolean;
  onToggleHideProjections: () => void;
  highlightLayer: number | null;
  onHighlightLayer: (layer: number | null) => void;
  onSnapCamera: (preset: CameraPreset) => void;
  hideCount?: boolean;
}

export const ProjectionPanels: React.FC<ProjectionPanelsProps> = ({
  projections,
  gridSize,
  sideDirection,
  onChangeSideDirection,
  showTopNumbers,
  onToggleTopNumbers,
  hideProjections,
  onToggleHideProjections,
  highlightLayer,
  onHighlightLayer,
  onSnapCamera,
  hideCount = false,
}) => {
  const sideGrid =
    sideDirection === 'right' ? projections.rightSide : projections.leftSide;

  const minMax =
    projections.totalCount > 0 && !projections.hasFloatingBlocks
      ? computeMinMaxBlocks(
          projections.front,
          projections.rightSide,
          projections.topMask,
          gridSize
        )
      : null;

  const visibleLayerCount = Math.max(1, projections.maxLayer);

  return (
    <div className="flex flex-col gap-3">
      {/* Summary Header Bar */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">총 쌓기나무</span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-extrabold bg-sky-600 text-white shadow-xs">
            {hideCount ? '? 개' : `${projections.totalCount}개`}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleHideProjections}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
            hideProjections
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
          title="머릿속으로 상상한 뒤 확인해 볼 때 투영도를 가릴 수 있어요"
        >
          {hideProjections ? (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>모양 펼치기</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>모양 가리기</span>
            </>
          )}
        </button>
      </div>

      {projections.hasFloatingBlocks && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <span>공중에 뜬 쌓기나무가 있어요. 교과서 기준 숫자표·최소/최대 계산은 바닥부터 쌓았을 때 정확해요.</span>
        </div>
      )}

      {hideProjections ? (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-500">
          <EyeOff className="w-7 h-7 mx-auto mb-2 text-slate-400" />
          <p className="text-sm font-bold text-slate-600">앞·옆·위 모양이 가려져 있어요</p>
          <p className="text-xs mt-1">
            3D 쌓기나무를 관찰하며 머릿속으로 그려본 뒤<br />
            [모양 펼치기]를 눌러 확인해 보세요!
          </p>
        </div>
      ) : (
        <>
          {/* Front & Side Views */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Front View */}
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs flex flex-col items-center">
              <button
                type="button"
                onClick={() => onSnapCamera('front')}
                className="w-full flex items-center justify-between gap-1 mb-2 group"
                title="클릭하면 3D 화면이 앞 시점으로 이동합니다"
              >
                <span className="text-[11px] font-extrabold text-sky-700 group-hover:underline whitespace-nowrap">
                  앞에서 본 모양
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 whitespace-nowrap shrink-0">
                  앞
                </span>
              </button>
              <MiniGrid
                gridSize={gridSize}
                cells={projections.front}
                bottomUp={true}
                fillColorClass="bg-sky-500"
                compact={gridSize > 5}
              />
              <div className="w-full flex justify-between text-[10px] text-slate-400 mt-1.5 px-1">
                <span>왼</span>
                <span>오른</span>
              </div>
            </div>

            {/* Side View */}
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs flex flex-col items-center">
              <div className="w-full flex items-center justify-between gap-1 mb-2">
                <button
                  type="button"
                  onClick={() =>
                    onSnapCamera(sideDirection === 'right' ? 'right' : 'left')
                  }
                  className="text-[11px] font-extrabold text-emerald-700 hover:underline whitespace-nowrap"
                  title="클릭하면 3D 화면이 옆 시점으로 이동합니다"
                >
                  옆에서 본 모양
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChangeSideDirection(sideDirection === 'right' ? 'left' : 'right')
                  }
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0"
                  title="오른쪽 옆 / 왼쪽 옆 시점 전환"
                >
                  {sideDirection === 'right' ? '오른쪽⇄' : '왼쪽⇄'}
                </button>
              </div>
              <MiniGrid
                gridSize={gridSize}
                cells={sideGrid}
                bottomUp={true}
                fillColorClass="bg-emerald-500"
                compact={gridSize > 5}
              />
              <div className="w-full flex justify-between text-[10px] text-slate-400 mt-1.5 px-1">
                <span>{sideDirection === 'right' ? '앞' : '뒤'}</span>
                <span>{sideDirection === 'right' ? '뒤' : '앞'}</span>
              </div>
            </div>
          </div>

          {/* Top View (with Textbook Number Mode!) */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => onSnapCamera('top')}
                className="text-xs font-extrabold text-amber-700 hover:underline flex items-center gap-1"
                title="클릭하면 3D 화면이 위 시점으로 이동합니다"
              >
                <span>위에서 본 모양</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                  위
                </span>
              </button>

              <button
                type="button"
                onClick={onToggleTopNumbers}
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                  showTopNumbers
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {showTopNumbers ? '층수 숫자 ON' : '층수 숫자 OFF'}
              </button>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-400 mb-1">뒤</span>
              <MiniGrid
                gridSize={gridSize}
                cells={projections.topMask}
                bottomUp={false}
                numbers={showTopNumbers && !hideCount ? projections.topCounts : undefined}
                fillColorClass="bg-amber-500"
                compact={gridSize > 5}
              />
              <span className="text-[10px] font-bold text-sky-600 mt-1">▲ 앞</span>
            </div>
          </div>

          {/* Min / Max Possible Count Explorer (초6-2 핵심 탐구) */}
          {minMax && !hideCount && (
            <div className="bg-gradient-to-r from-indigo-50 to-sky-50 border border-indigo-200/80 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-800 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>초6-2 탐구: 같은 삼면도로 가능한 개수</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-700">
                <span>
                  최소 <strong className="text-indigo-700">{minMax.minCount}개</strong> ~ 최대{' '}
                  <strong className="text-indigo-700">{minMax.maxCount}개</strong>
                </span>
                {minMax.minCount === minMax.maxCount ? (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    모양 1가지로 결정!
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                    숨은 자리 변화 가능
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Layer-by-Layer View (층별로 나타낸 모양) */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>층별로 나타낸 모양</span>
              </div>
              {highlightLayer !== null && (
                <button
                  type="button"
                  onClick={() => onHighlightLayer(null)}
                  className="text-[10px] font-bold text-indigo-600 hover:underline"
                >
                  강조 해제
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              층을 클릭하거나 마우스를 올리면 3D에서 해당 층만 강조돼요.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: visibleLayerCount }, (_, y) => {
                const isSelected = highlightLayer === y;
                const layerCount = projections.layers[y]
                  .flat()
                  .filter(Boolean).length;
                const layerBadgeColor = LAYER_COLORS[y % LAYER_COLORS.length];

                return (
                  <button
                    key={y}
                    type="button"
                    onMouseEnter={() => onHighlightLayer(y)}
                    onMouseLeave={() => onHighlightLayer(null)}
                    onClick={() => onHighlightLayer(isSelected ? null : y)}
                    className={`flex flex-col items-center p-1.5 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-200'
                        : 'border-slate-200 hover:border-indigo-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between mb-1 px-0.5">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: layerBadgeColor }}
                        />
                        {y + 1}층
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {hideCount ? '?' : `${layerCount}개`}
                      </span>
                    </div>
                    <MiniGrid
                      gridSize={gridSize}
                      cells={projections.layers[y]}
                      bottomUp={false}
                      fillColorClass="bg-indigo-500"
                      compact={true}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
