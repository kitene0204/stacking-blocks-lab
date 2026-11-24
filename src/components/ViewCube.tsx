import React from 'react';
import { Home, Box, Square } from 'lucide-react';
import type { CameraAngles, CameraPreset, ProjectionType } from '../types/blocks';

interface ViewCubeProps {
  angles: CameraAngles;
  projectionType: ProjectionType;
  onSelectPreset: (preset: CameraPreset) => void;
  onToggleProjection: () => void;
}

export const ViewCube: React.FC<ViewCubeProps> = ({
  angles,
  projectionType,
  onSelectPreset,
  onToggleProjection,
}) => {
  // Convert spherical camera angles (theta around Y, phi from +Y) to CSS 3D cube rotation
  // At front (theta=0, phi=PI/2): rotX=0, rotY=0
  // At top (theta=0, phi=0): rotX=-90deg (so top face faces viewer)
  // At right (theta=PI/2, phi=PI/2): rotY=-90deg (so right face faces viewer)
  const rotX = ((angles.phi - Math.PI / 2) * 180) / Math.PI;
  const rotY = ((-angles.theta) * 180) / Math.PI;

  const faceBase =
    'viewcube-face absolute inset-0 flex items-center justify-center text-[11px] font-bold border border-slate-400/80 cursor-pointer select-none transition-colors hover:bg-sky-200 hover:text-sky-900 shadow-inner';

  return (
    <div className="flex flex-col items-center gap-2.5">
      {/* 3D Tinkercad-style ViewCube */}
      <div
        className="viewcube-scene w-[76px] h-[76px] flex items-center justify-center"
        title="면을 클릭하면 해당 방향으로 시점이 전환됩니다"
      >
        <div
          className="viewcube-cube relative w-[52px] h-[52px]"
          style={{
            transform: `rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg)`,
          }}
        >
          {/* Front (+Z) */}
          <button
            type="button"
            onClick={() => onSelectPreset('front')}
            className={`${faceBase} bg-sky-100/95 text-sky-900`}
            style={{ transform: 'translateZ(26px)' }}
          >
            앞
          </button>
          {/* Back (-Z) */}
          <button
            type="button"
            onClick={() => onSelectPreset('back')}
            className={`${faceBase} bg-slate-100/95 text-slate-600`}
            style={{ transform: 'rotateY(180deg) translateZ(26px)' }}
          >
            뒤
          </button>
          {/* Right (+X) */}
          <button
            type="button"
            onClick={() => onSelectPreset('right')}
            className={`${faceBase} bg-emerald-100/95 text-emerald-900`}
            style={{ transform: 'rotateY(90deg) translateZ(26px)' }}
          >
            오른쪽
          </button>
          {/* Left (-X) */}
          <button
            type="button"
            onClick={() => onSelectPreset('left')}
            className={`${faceBase} bg-slate-100/95 text-slate-600`}
            style={{ transform: 'rotateY(-90deg) translateZ(26px)' }}
          >
            왼쪽
          </button>
          {/* Top (+Y) */}
          <button
            type="button"
            onClick={() => onSelectPreset('top')}
            className={`${faceBase} bg-amber-100/95 text-amber-900`}
            style={{ transform: 'rotateX(90deg) translateZ(26px)' }}
          >
            위
          </button>
          {/* Bottom (-Y) */}
          <div
            className="viewcube-face absolute inset-0 bg-slate-300/90 border border-slate-400"
            style={{ transform: 'rotateX(-90deg) translateZ(26px)' }}
          />
        </div>
      </div>

      {/* Quick Tinkercad Left-Side Camera Buttons */}
      <div className="flex flex-col gap-1.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-xl shadow-md border border-slate-200/90">
        <button
          type="button"
          onClick={() => onSelectPreset('home')}
          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition-colors"
          title="기본 홈 시점으로 돌아가기 (H)"
        >
          <Home className="w-3.5 h-3.5" />
          <span>홈</span>
        </button>

        <button
          type="button"
          onClick={onToggleProjection}
          className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            projectionType === 'orthographic'
              ? 'bg-sky-600 text-white'
              : 'text-slate-700 hover:bg-sky-50 hover:text-sky-700'
          }`}
          title="원근 투영 / 직교 투영 전환 (평면도 확인 시 직교 투영 추천)"
        >
          {projectionType === 'orthographic' ? (
            <>
              <Square className="w-3.5 h-3.5" />
              <span>직교</span>
            </>
          ) : (
            <>
              <Box className="w-3.5 h-3.5" />
              <span>원근</span>
            </>
          )}
        </button>

        <div className="h-px bg-slate-200 my-0.5" />

        <div className="grid grid-cols-1 gap-1">
          <button
            type="button"
            onClick={() => onSelectPreset('front')}
            className="px-2 py-1 rounded text-[11px] font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors"
            title="앞에서 본 시점 (단축키 1)"
          >
            앞 (1)
          </button>
          <button
            type="button"
            onClick={() => onSelectPreset('right')}
            className="px-2 py-1 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
            title="오른쪽 옆 시점 (단축키 2)"
          >
            옆 (2)
          </button>
          <button
            type="button"
            onClick={() => onSelectPreset('top')}
            className="px-2 py-1 rounded text-[11px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
            title="위에서 본 시점 (단축키 3)"
          >
            위 (3)
          </button>
        </div>
      </div>
    </div>
  );
};
