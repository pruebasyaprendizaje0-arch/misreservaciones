'use client';

import React, { useState } from 'react';

export type ToothCondition =
  | 'SANO'
  | 'CARIES'
  | 'RESINA'
  | 'CORONA'
  | 'ENDODONCIA'
  | 'AUSENTE'
  | 'SELLADOR';

export interface ToothSurfaceState {
  vestibular?: ToothCondition;
  lingual?: ToothCondition;
  mesial?: ToothCondition;
  distal?: ToothCondition;
  oclusal?: ToothCondition;
}

export interface ToothData {
  toothNumber: number;
  overallState: ToothCondition;
  surfaces: ToothSurfaceState;
  notes?: string;
}

interface OdontogramProps {
  initialData?: ToothData[];
  onChange: (data: ToothData[]) => void;
  readOnly?: boolean;
}

const CONDITION_COLORS: Record<ToothCondition, { bg: string; text: string; label: string; border: string; emoji: string }> = {
  SANO: { bg: 'bg-white dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', label: 'Sano', border: 'border-slate-300 dark:border-slate-700', emoji: '⚪' },
  CARIES: { bg: 'bg-red-500', text: 'text-white', label: 'Caries (Rojo)', border: 'border-red-600', emoji: '🔴' },
  RESINA: { bg: 'bg-blue-500', text: 'text-white', label: 'Resina / Obturado (Azul)', border: 'border-blue-600', emoji: '🔵' },
  CORONA: { bg: 'bg-amber-500', text: 'text-white', label: 'Corona / Prótesis (Dorado)', border: 'border-amber-600', emoji: '🟡' },
  ENDODONCIA: { bg: 'bg-purple-600', text: 'text-white', label: 'Endodoncia (Morado)', border: 'border-purple-700', emoji: '🟣' },
  AUSENTE: { bg: 'bg-slate-400 dark:bg-slate-600', text: 'text-white', label: 'Ausente / Extracción (Gris)', border: 'border-slate-500', emoji: '❌' },
  SELLADOR: { bg: 'bg-emerald-500', text: 'text-white', label: 'Sellador (Verde)', border: 'border-emerald-600', emoji: '🟢' },
};

const CONDITION_FILLS: Record<ToothCondition, string> = {
  SANO: '#ffffff',
  CARIES: '#ef4444',
  RESINA: '#3b82f6',
  CORONA: '#f59e0b',
  ENDODONCIA: '#9333ea',
  AUSENTE: '#94a3b8',
  SELLADOR: '#10b981',
};

// FDI Quadrants (Adult 32 Teeth)
const ADULT_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const ADULT_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const ADULT_LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const ADULT_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];

// FDI Quadrants (Child 20 Teeth)
const CHILD_UPPER_RIGHT = [55, 54, 53, 52, 51];
const CHILD_UPPER_LEFT = [61, 62, 63, 64, 65];
const CHILD_LOWER_RIGHT = [85, 84, 83, 82, 81];
const CHILD_LOWER_LEFT = [71, 72, 73, 74, 75];

// FDI to Universal Numbering Mapping (1 to 32)
const FDI_TO_UNIVERSAL: Record<number, number> = {
  // Adult Upper (18 to 28 -> 1 to 16)
  18: 1, 17: 2, 16: 3, 15: 4, 14: 5, 13: 6, 12: 7, 11: 8,
  21: 9, 22: 10, 23: 11, 24: 12, 25: 13, 26: 14, 27: 15, 28: 16,
  // Adult Lower (38 to 31 -> 17 to 24, 41 to 48 -> 25 to 32)
  38: 17, 37: 18, 36: 19, 35: 20, 34: 21, 33: 22, 32: 23, 31: 24,
  41: 25, 42: 26, 43: 27, 44: 28, 45: 29, 46: 30, 47: 31, 48: 32,

  // Child (55 to 65 -> 1 to 10, 75 to 85 -> 11 to 20)
  55: 1, 54: 2, 53: 3, 52: 4, 51: 5,
  61: 6, 62: 7, 63: 8, 64: 9, 65: 10,
  75: 11, 74: 12, 73: 13, 72: 14, 71: 15,
  81: 16, 82: 17, 83: 18, 84: 19, 85: 20,
};

function formatToothNumber(fdiNum: number, system: 'FDI' | 'UNIVERSAL'): string {
  if (system === 'UNIVERSAL') {
    return String(FDI_TO_UNIVERSAL[fdiNum] || fdiNum);
  }
  return String(fdiNum);
}

type MobileQuadrantView = 'ALL' | 'UPPER' | 'LOWER' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

export function Odontogram({ initialData = [], onChange, readOnly = false }: OdontogramProps) {
  const [teethMap, setTeethMap] = useState<Record<number, ToothData>>(() => {
    const map: Record<number, ToothData> = {};
    initialData.forEach((t) => {
      map[t.toothNumber] = t;
    });
    return map;
  });

  const [dentitionType, setDentitionType] = useState<'ADULT' | 'CHILD'>('ADULT');
  const [numberingSystem, setNumberingSystem] = useState<'FDI' | 'UNIVERSAL'>('UNIVERSAL');
  const [selectedCondition, setSelectedCondition] = useState<ToothCondition>('CARIES');
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [selectedSurface, setSelectedSurface] = useState<keyof ToothSurfaceState | 'OVERALL'>('OVERALL');
  const [toothNote, setToothNote] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileQuadrant, setMobileQuadrant] = useState<MobileQuadrantView>('ALL');
  const [showMobileToothModal, setShowMobileToothModal] = useState(false);

  function getTooth(toothNum: number): ToothData {
    return (
      teethMap[toothNum] || {
        toothNumber: toothNum,
        overallState: 'SANO',
        surfaces: {},
      }
    );
  }

  function updateToothState(toothNum: number, condition: ToothCondition, surface?: keyof ToothSurfaceState) {
    if (readOnly) return;
    const current = getTooth(toothNum);
    let updated: ToothData;

    if (!surface || surface === ('OVERALL' as any)) {
      updated = {
        ...current,
        overallState: condition,
      };
    } else {
      updated = {
        ...current,
        surfaces: {
          ...current.surfaces,
          [surface]: condition,
        },
      };
    }

    const nextMap = { ...teethMap, [toothNum]: updated };
    setTeethMap(nextMap);
    onChange(Object.values(nextMap));
  }

  function saveToothNote(toothNum: number, note: string) {
    if (readOnly) return;
    const current = getTooth(toothNum);
    const updated = { ...current, notes: note };
    const nextMap = { ...teethMap, [toothNum]: updated };
    setTeethMap(nextMap);
    onChange(Object.values(nextMap));
  }

  // Count summary stats
  const stats = Object.values(teethMap).reduce(
    (acc, t) => {
      if (t.overallState !== 'SANO') acc[t.overallState] = (acc[t.overallState] || 0) + 1;
      Object.values(t.surfaces).forEach((s) => {
        if (s && s !== 'SANO') acc.surfaceIssues += 1;
      });
      return acc;
    },
    { surfaceIssues: 0 } as Record<string, number>
  );

  // Render SVG Tooth with 5 surfaces
  function renderToothSVG(toothNum: number, isLarge: boolean = false, isMobileHighlight: boolean = false) {
    const data = getTooth(toothNum);
    const isSelected = selectedTooth === toothNum;

    const fillV = CONDITION_FILLS[data.surfaces.vestibular || data.overallState];
    const fillL = CONDITION_FILLS[data.surfaces.lingual || data.overallState];
    const fillM = CONDITION_FILLS[data.surfaces.mesial || data.overallState];
    const fillD = CONDITION_FILLS[data.surfaces.distal || data.overallState];
    const fillO = CONDITION_FILLS[data.surfaces.oclusal || data.overallState];

    const sizeClass = isLarge
      ? 'w-10 h-10 sm:w-12 sm:h-12'
      : isMobileHighlight
      ? 'w-9 h-9 sm:w-10 sm:h-10'
      : 'w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9';

    return (
      <div
        key={toothNum}
        onClick={() => {
          setSelectedTooth(toothNum);
          setToothNote(data.notes || '');
          if (!readOnly) {
            updateToothState(toothNum, selectedCondition, selectedSurface === 'OVERALL' ? undefined : selectedSurface);
          }
          // On mobile or narrow view, open detail modal if needed
          if (window.innerWidth < 768) {
            setShowMobileToothModal(true);
          }
        }}
        className={`relative flex flex-col items-center p-1 sm:p-1.5 rounded-xl border transition-all cursor-pointer select-none shrink-0 ${
          isSelected
            ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-950/80 shadow-md ring-2 ring-indigo-500 scale-105 z-10'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-600'
        }`}
      >
        <span className="text-[10px] sm:text-xs font-black text-slate-800 dark:text-slate-200 mb-0.5">
          {formatToothNumber(toothNum, numberingSystem)}
        </span>

        {/* Tooth SVG Surface Diagram */}
        <div className={`relative ${sizeClass}`}>
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            {/* Vestibular (Top) */}
            <polygon points="0,0 100,0 75,25 25,25" fill={fillV} stroke="#475569" strokeWidth="3" />
            {/* Distal / Right */}
            <polygon points="100,0 100,100 75,75 75,25" fill={fillD} stroke="#475569" strokeWidth="3" />
            {/* Lingual / Bottom */}
            <polygon points="100,100 0,100 25,75 75,75" fill={fillL} stroke="#475569" strokeWidth="3" />
            {/* Mesial / Left */}
            <polygon points="0,100 0,0 25,25 25,75" fill={fillM} stroke="#475569" strokeWidth="3" />
            {/* Oclusal / Center */}
            <polygon points="25,25 75,25 75,75 25,75" fill={fillO} stroke="#475569" strokeWidth="3" />

            {/* Ausente Overlay (X) */}
            {data.overallState === 'AUSENTE' && (
              <g stroke="#dc2626" strokeWidth="12" strokeLinecap="round">
                <line x1="10" y1="10" x2="90" y2="90" />
                <line x1="90" y1="10" x2="10" y2="90" />
              </g>
            )}

            {/* Corona Ring Overlay */}
            {data.overallState === 'CORONA' && (
              <rect x="5" y="5" width="90" height="90" fill="none" stroke="#d97706" strokeWidth="8" rx="10" />
            )}

            {/* Endodoncia Vertical Line */}
            {data.overallState === 'ENDODONCIA' && (
              <line x1="50" y1="5" x2="50" y2="95" stroke="#7e22ce" strokeWidth="14" strokeLinecap="round" />
            )}
          </svg>

          {data.notes && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
              📝
            </span>
          )}
        </div>

        {/* State Badge */}
        <span className="mt-0.5 text-[8px] sm:text-[9px] font-bold truncate max-w-[38px] sm:max-w-[46px] text-center text-slate-500 dark:text-slate-400">
          {data.overallState}
        </span>
      </div>
    );
  }

  // Large interactive tooth editor SVG for modal or focus on mobile
  function renderLargeInteractiveTooth(toothNum: number) {
    const data = getTooth(toothNum);
    const fillV = CONDITION_FILLS[data.surfaces.vestibular || data.overallState];
    const fillL = CONDITION_FILLS[data.surfaces.lingual || data.overallState];
    const fillM = CONDITION_FILLS[data.surfaces.mesial || data.overallState];
    const fillD = CONDITION_FILLS[data.surfaces.distal || data.overallState];
    const fillO = CONDITION_FILLS[data.surfaces.oclusal || data.overallState];

    return (
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 drop-shadow-md">
          <svg viewBox="0 0 100 100" className="w-full h-full cursor-pointer select-none">
            {/* Vestibular (Top) */}
            <polygon
              points="0,0 100,0 75,25 25,25"
              fill={fillV}
              stroke="#334155"
              strokeWidth="2.5"
              onClick={() => updateToothState(toothNum, selectedCondition, 'vestibular')}
              className="hover:opacity-80 transition"
            />
            {/* Distal (Right) */}
            <polygon
              points="100,0 100,100 75,75 75,25"
              fill={fillD}
              stroke="#334155"
              strokeWidth="2.5"
              onClick={() => updateToothState(toothNum, selectedCondition, 'distal')}
              className="hover:opacity-80 transition"
            />
            {/* Lingual (Bottom) */}
            <polygon
              points="100,100 0,100 25,75 75,75"
              fill={fillL}
              stroke="#334155"
              strokeWidth="2.5"
              onClick={() => updateToothState(toothNum, selectedCondition, 'lingual')}
              className="hover:opacity-80 transition"
            />
            {/* Mesial (Left) */}
            <polygon
              points="0,100 0,0 25,25 25,75"
              fill={fillM}
              stroke="#334155"
              strokeWidth="2.5"
              onClick={() => updateToothState(toothNum, selectedCondition, 'mesial')}
              className="hover:opacity-80 transition"
            />
            {/* Oclusal (Center) */}
            <polygon
              points="25,25 75,25 75,75 25,75"
              fill={fillO}
              stroke="#334155"
              strokeWidth="2.5"
              onClick={() => updateToothState(toothNum, selectedCondition, 'oclusal')}
              className="hover:opacity-80 transition"
            />

            {/* Labels overlay */}
            <text x="50" y="16" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#1e293b" pointerEvents="none">V</text>
            <text x="88" y="53" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#1e293b" pointerEvents="none">D</text>
            <text x="50" y="90" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#1e293b" pointerEvents="none">L</text>
            <text x="12" y="53" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#1e293b" pointerEvents="none">M</text>
            <text x="50" y="53" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#1e293b" pointerEvents="none">O</text>
          </svg>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium text-center">
          Toca cualquier sección: <strong>V</strong>estibular, <strong>D</strong>istal, <strong>L</strong>ingual, <strong>M</strong>esial u <strong>O</strong>clusal
        </p>

        {/* Quick overall apply button */}
        <button
          type="button"
          onClick={() => updateToothState(toothNum, selectedCondition, undefined)}
          className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition shadow-sm flex items-center justify-center gap-1.5"
        >
          <span>⚡ Aplicar a Pieza Completa ({selectedCondition})</span>
        </button>
      </div>
    );
  }

  const renderChartBody = (isLarge: boolean = false) => {
    const isAdult = dentitionType === 'ADULT';

    const showUpper = mobileQuadrant === 'ALL' || mobileQuadrant === 'UPPER' || mobileQuadrant === 'Q1' || mobileQuadrant === 'Q2';
    const showLower = mobileQuadrant === 'ALL' || mobileQuadrant === 'LOWER' || mobileQuadrant === 'Q3' || mobileQuadrant === 'Q4';

    return (
      <div className="space-y-4 bg-white dark:bg-slate-900 p-2 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
        {isAdult ? (
          <>
            {/* Upper Arch */}
            {showUpper && (
              <div className="space-y-2">
                <div className="text-center text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-2">
                  <span>Arcada Superior (Maxilar) — 16 Dientes (18 a 28)</span>
                </div>

                {/* Desktop: 16 in single row / Mobile: Quadrant split */}
                <div className="hidden md:flex items-center justify-center gap-1 mx-auto">
                  {/* Cuadrante 1 (18-11) */}
                  {(mobileQuadrant === 'ALL' || mobileQuadrant === 'UPPER' || mobileQuadrant === 'Q1') && (
                    <div className="flex items-center justify-end gap-1 border-r-2 border-indigo-500/40 pr-2">
                      {ADULT_UPPER_RIGHT.map((n) => renderToothSVG(n, isLarge))}
                    </div>
                  )}
                  {/* Cuadrante 2 (21-28) */}
                  {(mobileQuadrant === 'ALL' || mobileQuadrant === 'UPPER' || mobileQuadrant === 'Q2') && (
                    <div className="flex items-center justify-start gap-1 pl-2">
                      {ADULT_UPPER_LEFT.map((n) => renderToothSVG(n, isLarge))}
                    </div>
                  )}
                </div>

                {/* Mobile: 2 Quadrant rows (8 teeth each) */}
                <div className="flex md:hidden flex-col gap-3">
                  {(mobileQuadrant === 'ALL' || mobileQuadrant === 'UPPER' || mobileQuadrant === 'Q1') && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-extrabold text-indigo-500 uppercase px-1">
                        <span>Q1 • Superior Derecho (18 - 11)</span>
                        <span className="text-slate-400 font-normal">↔ Desliza</span>
                      </div>
                      <div className="flex items-center justify-start gap-1.5 overflow-x-auto custom-scrollbar py-2 px-1">
                        {ADULT_UPPER_RIGHT.map((n) => renderToothSVG(n, false, true))}
                      </div>
                    </div>
                  )}

                  {(mobileQuadrant === 'ALL' || mobileQuadrant === 'UPPER' || mobileQuadrant === 'Q2') && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-extrabold text-indigo-500 uppercase px-1">
                        <span>Q2 • Superior Izquierdo (21 - 28)</span>
                        <span className="text-slate-400 font-normal">↔ Desliza</span>
                      </div>
                      <div className="flex items-center justify-start gap-1.5 overflow-x-auto custom-scrollbar py-2 px-1">
                        {ADULT_UPPER_LEFT.map((n) => renderToothSVG(n, false, true))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {showUpper && showLower && (
              <div className="w-full border-t-2 border-dashed border-slate-200 dark:border-slate-700 my-3" />
            )}

            {/* Lower Arch */}
            {showLower && (
              <div className="space-y-2">
                {/* Desktop: 16 in single row */}
                <div className="hidden md:flex items-center justify-center gap-1 mx-auto">
                  {/* Cuadrante 4 (48-41) */}
                  {(mobileQuadrant === 'ALL' || mobileQuadrant === 'LOWER' || mobileQuadrant === 'Q4') && (
                    <div className="flex items-center justify-end gap-1 border-r-2 border-indigo-500/40 pr-2">
                      {ADULT_LOWER_RIGHT.map((n) => renderToothSVG(n, isLarge))}
                    </div>
                  )}
                  {/* Cuadrante 3 (31-38) */}
                  {(mobileQuadrant === 'ALL' || mobileQuadrant === 'LOWER' || mobileQuadrant === 'Q3') && (
                    <div className="flex items-center justify-start gap-1 pl-2">
                      {ADULT_LOWER_LEFT.map((n) => renderToothSVG(n, isLarge))}
                    </div>
                  )}
                </div>

                {/* Mobile: 2 Quadrant rows (8 teeth each) */}
                <div className="flex md:hidden flex-col gap-3">
                  {(mobileQuadrant === 'ALL' || mobileQuadrant === 'LOWER' || mobileQuadrant === 'Q4') && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-extrabold text-indigo-500 uppercase px-1">
                        <span>Q4 • Inferior Derecho (48 - 41)</span>
                        <span className="text-slate-400 font-normal">↔ Desliza</span>
                      </div>
                      <div className="flex items-center justify-start gap-1.5 overflow-x-auto custom-scrollbar py-2 px-1">
                        {ADULT_LOWER_RIGHT.map((n) => renderToothSVG(n, false, true))}
                      </div>
                    </div>
                  )}

                  {(mobileQuadrant === 'ALL' || mobileQuadrant === 'LOWER' || mobileQuadrant === 'Q3') && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-extrabold text-indigo-500 uppercase px-1">
                        <span>Q3 • Inferior Izquierdo (31 - 38)</span>
                        <span className="text-slate-400 font-normal">↔ Desliza</span>
                      </div>
                      <div className="flex items-center justify-start gap-1.5 overflow-x-auto custom-scrollbar py-2 px-1">
                        {ADULT_LOWER_LEFT.map((n) => renderToothSVG(n, false, true))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-center text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mt-2 flex items-center justify-center gap-2">
                  <span>Arcada Inferior (Mandíbula) — 16 Dientes (48 a 38)</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Child Upper */}
            {showUpper && (
              <div className="space-y-2">
                <div className="text-center text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
                  Dentición Infantil Superior — 10 Dientes (55 a 65)
                </div>
                <div className="flex items-center justify-start sm:justify-center gap-1.5 overflow-x-auto custom-scrollbar py-2 px-1">
                  {(mobileQuadrant === 'ALL' || mobileQuadrant === 'UPPER' || mobileQuadrant === 'Q1') && (
                    <div className="flex items-center justify-end gap-1 border-r-2 border-indigo-500/40 pr-2">
                      {CHILD_UPPER_RIGHT.map((n) => renderToothSVG(n, isLarge, true))}
                    </div>
                  )}
                  {(mobileQuadrant === 'ALL' || mobileQuadrant === 'UPPER' || mobileQuadrant === 'Q2') && (
                    <div className="flex items-center justify-start gap-1 pl-2">
                      {CHILD_UPPER_LEFT.map((n) => renderToothSVG(n, isLarge, true))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {showUpper && showLower && (
              <div className="w-full border-t-2 border-dashed border-slate-200 dark:border-slate-700 my-3" />
            )}

            {/* Child Lower */}
            {showLower && (
              <div className="space-y-2">
                <div className="flex items-center justify-start sm:justify-center gap-1.5 overflow-x-auto custom-scrollbar py-2 px-1">
                  {(mobileQuadrant === 'ALL' || mobileQuadrant === 'LOWER' || mobileQuadrant === 'Q4') && (
                    <div className="flex items-center justify-end gap-1 border-r-2 border-indigo-500/40 pr-2">
                      {CHILD_LOWER_RIGHT.map((n) => renderToothSVG(n, isLarge, true))}
                    </div>
                  )}
                  {(mobileQuadrant === 'ALL' || mobileQuadrant === 'LOWER' || mobileQuadrant === 'Q3') && (
                    <div className="flex items-center justify-start gap-1 pl-2">
                      {CHILD_LOWER_LEFT.map((n) => renderToothSVG(n, isLarge, true))}
                    </div>
                  )}
                </div>
                <div className="text-center text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mt-2">
                  Dentición Infantil Inferior — 10 Dientes (85 a 75)
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5 bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
      {/* Header controls & Palette */}
      <div className="flex flex-col gap-3 pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>🦷</span> Odontograma Clínico Interactivo (FDI)
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Haz clic o toca en una pieza dental para registrar tratamientos por superficie o pieza completa.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-900 text-white dark:bg-slate-800 hover:bg-slate-800 transition border border-slate-700 flex items-center gap-1.5 shadow-xs"
            >
              <span>🔍</span>
              <span className="hidden sm:inline">Pantalla Completa</span>
              <span className="sm:hidden">Ampliar</span>
            </button>
          </div>
        </div>

        {/* Dentition & Numbering System Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Dentition Type */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDentitionType('ADULT')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition border ${
                dentitionType === 'ADULT'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              🦷 Adulto (32)
            </button>
            <button
              type="button"
              onClick={() => setDentitionType('CHILD')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition border ${
                dentitionType === 'CHILD'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              👶 Infantil (20)
            </button>
          </div>

          {/* Numbering System Toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setNumberingSystem('UNIVERSAL')}
              className={`px-2 py-1 rounded-lg text-xs font-extrabold transition ${
                numberingSystem === 'UNIVERSAL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🔢 Universal
            </button>
            <button
              type="button"
              onClick={() => setNumberingSystem('FDI')}
              className={`px-2 py-1 rounded-lg text-xs font-extrabold transition ${
                numberingSystem === 'FDI'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🌐 FDI
            </button>
          </div>
        </div>

        {/* Mobile View Filters (Arcadas & Cuadrantes para Celular) */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-2 pt-1">
          <span className="text-[11px] font-bold text-slate-500 shrink-0 mr-1">Vista:</span>
          {(
            [
              { id: 'ALL', label: '⭐ Completo' },
              { id: 'UPPER', label: '⬆️ Arcada Superior' },
              { id: 'LOWER', label: '⬇️ Arcada Inferior' },
              { id: 'Q1', label: '1️⃣ Q1 Sup. Der' },
              { id: 'Q2', label: '2️⃣ Q2 Sup. Izq' },
              { id: 'Q3', label: '3️⃣ Q3 Inf. Izq' },
              { id: 'Q4', label: '4️⃣ Q4 Inf. Der' },
            ] as const
          ).map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setMobileQuadrant(q.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 whitespace-nowrap transition border ${
                mobileQuadrant === q.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Palette Toolbar & Surface Selector */}
      {!readOnly && (
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              1. Selecciona Condición / Tratamiento:
            </span>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="shrink-0">Superficie:</span>
              <select
                value={selectedSurface}
                onChange={(e) => setSelectedSurface(e.target.value as any)}
                className="w-full sm:w-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <option value="OVERALL">⚡ Pieza Completa</option>
                <option value="vestibular">⬆ Vestibular (V)</option>
                <option value="lingual">⬇ Lingual / Palatino (L)</option>
                <option value="mesial">⬅ Mesial (M)</option>
                <option value="distal">➡ Distal (D)</option>
                <option value="oclusal">⏺ Oclusal / Incisal (O)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-nowrap sm:flex-wrap gap-1.5 sm:gap-2 overflow-x-auto custom-scrollbar pb-2">
            {(Object.keys(CONDITION_COLORS) as ToothCondition[]).map((cond) => {
              const info = CONDITION_COLORS[cond];
              const isSel = selectedCondition === cond;
              return (
                <button
                  key={cond}
                  type="button"
                  onClick={() => setSelectedCondition(cond)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold border shrink-0 whitespace-nowrap transition active:scale-95 ${
                    isSel
                      ? 'ring-2 ring-indigo-500 shadow-sm border-indigo-600 scale-102'
                      : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                  } ${info.bg} ${info.text}`}
                >
                  <span>{info.emoji}</span>
                  <span>{info.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Chart Body */}
      {renderChartBody(false)}

      {/* Selected Tooth Detail & Note Panel (Desktop / Tablet) */}
      {selectedTooth && (
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 text-sm border border-indigo-200 dark:border-indigo-800">
              #{formatToothNumber(selectedTooth, numberingSystem)}
            </div>
            <div>
              <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                Pieza #{formatToothNumber(selectedTooth, numberingSystem)} (FDI #{selectedTooth} · Univ #{FDI_TO_UNIVERSAL[selectedTooth] || selectedTooth})
              </span>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-700 dark:text-slate-300 font-bold">
                <span>Estado:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${CONDITION_COLORS[getTooth(selectedTooth).overallState].bg} ${CONDITION_COLORS[getTooth(selectedTooth).overallState].text}`}>
                  {getTooth(selectedTooth).overallState}
                </span>
                <button
                  type="button"
                  onClick={() => setShowMobileToothModal(true)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 underline ml-2 font-bold cursor-pointer"
                >
                  🔍 Editar Superficies (V/M/D/L/O)
                </button>
              </div>
            </div>
          </div>

          {!readOnly && (
            <div className="w-full sm:w-1/2 flex items-center gap-2">
              <input
                type="text"
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100"
                placeholder="Observación de esta pieza..."
                value={toothNote}
                onChange={(e) => setToothNote(e.target.value)}
              />
              <button
                type="button"
                onClick={() => saveToothNote(selectedTooth, toothNote)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs shrink-0"
              >
                Guardar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-1">
        <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium">🔴 Caries</span>
          <p className="text-base sm:text-lg font-black text-red-500">{stats.CARIES || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium">🔵 Resina / Obtur.</span>
          <p className="text-base sm:text-lg font-black text-blue-500">{stats.RESINA || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium">🟣 Endodoncias</span>
          <p className="text-base sm:text-lg font-black text-purple-500">{stats.ENDODONCIA || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium">❌ Ausentes</span>
          <p className="text-base sm:text-lg font-black text-slate-400">{stats.AUSENTE || 0}</p>
        </div>
      </div>

      {/* ── MODAL DE EDICIÓN DE SUPERFICIES PARA CELULAR & TABLET ── */}
      {showMobileToothModal && selectedTooth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>🦷</span> Pieza Dental #{formatToothNumber(selectedTooth, numberingSystem)}
                </h3>
                <p className="text-[11px] text-slate-500">
                  FDI: #{selectedTooth} · Universal: #{FDI_TO_UNIVERSAL[selectedTooth] || selectedTooth}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileToothModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {/* Condition selector inside modal */}
            <div>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                1. Condición a aplicar:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(CONDITION_COLORS) as ToothCondition[]).map((cond) => {
                  const info = CONDITION_COLORS[cond];
                  const isSel = selectedCondition === cond;
                  return (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setSelectedCondition(cond)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold border transition ${
                        isSel
                          ? 'ring-2 ring-indigo-500 shadow-sm border-indigo-600'
                          : 'border-slate-200 dark:border-slate-800'
                      } ${info.bg} ${info.text}`}
                    >
                      <span>{info.emoji}</span>
                      <span className="truncate">{info.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Large interactive tooth diagram */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center">
              {renderLargeInteractiveTooth(selectedTooth)}
            </div>

            {/* Note field inside modal */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Observaciones clínicas / tratamiento:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-medium"
                  placeholder="Ej. Caries oclusal profunda..."
                  value={toothNote}
                  onChange={(e) => setToothNote(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => saveToothNote(selectedTooth, toothNote)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Guardar
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowMobileToothModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-extrabold text-xs hover:bg-slate-800 transition"
              >
                Cerrar Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL FULLSCREEN ODONTOGRAM ── */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="relative w-full max-w-6xl bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>🦷</span> Odontograma Clínico — Vista Completa
              </h3>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 transition text-xs"
              >
                ✕ Cerrar
              </button>
            </div>

            {renderChartBody(true)}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-extrabold hover:bg-indigo-700 transition text-xs shadow-sm"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
