import React, { useState } from 'react';
import { X, Mouse, Keyboard, Share2, Copy, Check, Download } from 'lucide-react';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
  shortRightClickErase: boolean;
  onToggleShortRightClickErase: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  open,
  onClose,
  shortRightClickErase,
  onToggleShortRightClickErase,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-sky-50/70">
          <div className="flex items-center gap-2">
            <Mouse className="w-5 h-5 text-sky-600" />
            <h3 className="text-base font-extrabold text-slate-800">
              틴커캐드 마우스 조작 & 단축키 안내
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-50/70 border border-sky-100">
              <span className="font-bold text-slate-700">마우스 왼쪽 클릭</span>
              <span className="font-extrabold text-sky-700">쌓기나무 쌓기</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/70 border border-rose-100">
              <span className="font-bold text-slate-700">Shift + 왼쪽 클릭 (또는 빼기 모드)</span>
              <span className="font-extrabold text-rose-700">쌓기나무 빼기 (삭제)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="font-bold text-slate-700">마우스 우클릭 + 드래그</span>
              <span className="font-extrabold text-slate-800">360° 화면 회전 (Orbit)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="font-bold text-slate-700">
                마우스 휠 클릭 + 드래그 <span className="text-slate-400 font-normal">(Shift+우클릭)</span>
              </span>
              <span className="font-extrabold text-slate-800">화면 평행 이동 (Pan)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="font-bold text-slate-700">마우스 휠 스크롤</span>
              <span className="font-extrabold text-slate-800">확대 / 축소 (Zoom)</span>
            </div>
          </div>

          {/* Optional short right click erase toggle */}
          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer">
            <div>
              <p className="text-xs font-extrabold text-slate-700">
                짧은 우클릭(드래그 없이)으로도 쌓기나무 빼기
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                켜면 키보드 Shift 없이도 짧은 우클릭으로 빠르게 제거할 수 있어요.
              </p>
            </div>
            <input
              type="checkbox"
              checked={shortRightClickErase}
              onChange={onToggleShortRightClickErase}
              className="w-4 h-4 accent-sky-600"
            />
          </label>

          {/* Keyboard Shortcuts */}
          <div className="pt-1">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-600 mb-2">
              <Keyboard className="w-4 h-4 text-slate-500" />
              <span>유용한 단축키</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600">
              <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/70">
                <kbd className="font-bold text-slate-800">B</kbd> /{' '}
                <kbd className="font-bold text-slate-800">E</kbd> : 쌓기 / 빼기 모드
              </div>
              <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/70">
                <kbd className="font-bold text-slate-800">Ctrl+Z</kbd> /{' '}
                <kbd className="font-bold text-slate-800">Ctrl+Y</kbd> : 실행취소/다시
              </div>
              <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/70">
                <kbd className="font-bold text-slate-800">1</kbd>{' '}
                <kbd className="font-bold text-slate-800">2</kbd>{' '}
                <kbd className="font-bold text-slate-800">3</kbd> : 앞 / 옆 / 위 시점
              </div>
              <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/70">
                <kbd className="font-bold text-slate-800">H</kbd> : 기본 홈 시점으로 리셋
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
          >
            확인했어요
          </button>
        </div>
      </div>
    </div>
  );
};

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  shareCode: string;
  onImportCode: (code: string) => boolean;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  open,
  onClose,
  shareCode,
  onImportCode,
}) => {
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState(false);

  if (!open) return null;

  const shareUrl = `${window.location.origin}${window.location.pathname}#code=${shareCode}`;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback ignored
    }
  };

  const handleImport = () => {
    const cleaned = importText.includes('#code=')
      ? importText.split('#code=')[1]
      : importText;
    const ok = onImportCode(cleaned);
    if (ok) {
      setImportError(false);
      setImportText('');
      onClose();
    } else {
      setImportError(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-indigo-50/70">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-extrabold text-slate-800">
              쌓기나무 모양 공유 · 불러오기
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-extrabold text-slate-700 mb-1.5">
              내가 만든 모양 공유 링크
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-mono"
              />
              <button
                type="button"
                onClick={() => handleCopy(shareUrl)}
                className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '복사됨!' : '복사'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              친구에게 링크나 코드를 보내면 같은 쌓기나무 모양을 바로 열어볼 수 있어요.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-extrabold text-slate-700 mb-1.5">
              공유 코드 또는 링크 불러오기
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  setImportError(false);
                }}
                placeholder="공유 링크 또는 코드를 붙여넣으세요"
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleImport}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>불러오기</span>
              </button>
            </div>
            {importError && (
              <p className="text-[11px] text-rose-600 font-semibold mt-1">
                올바른 공유 코드가 아니에요. 다시 확인해 주세요.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
