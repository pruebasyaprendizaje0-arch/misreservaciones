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

const CONDITION_COLORS: Record<ToothCondition, { bg: string; text: string; label: string; border: string }> = {
  SANO: { bg: 'bg-white dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', label: 'Sano', border: 'border-slate-300 dark:border-slate-700' },
  CARIES: { bg: 'bg-red-500', text: 'text-white', label: 'Caries (Rojo)', border: 'border-red-600' },
  RESINA: { bg: 'bg-blue-500', text: 'text-white', label: 'Resina / Obturado (Azul)', border: 'border-blue-600' },
  CORONA: { bg: 'bg-amber-500', text: 'text-white', label: 'Corona / Prótesis (Dorado)', border: 'border-amber-600' },
  ENDODONCIA: { bg: 'bg-purple-600', text: 'text-white', label: 'Endodoncia (Morado)', border: 'border-purple-700' },
  AUSENTE: { bg: 'bg-slate-400 dark:bg-slate-600', text: 'text-white', label: 'Ausente / Extracción (Gris)', border: 'border-slate-500' },
  SELLADOR: { bg: 'bg-emerald-500', text: 'text-white', label: 'Sellador (Verde)', border: 'border-emerald-600' },
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
  function renderToothSVG(toothNum: number, isLarge: boolean = false) {
    const data = getTooth(toothNum);
    const isSelected = selectedTooth === toothNum;

    const fillV = CONDITION_FILLS[data.surfaces.vestibular || data.overallState];
    const fillL = CONDITION_FILLS[data.surfaces.lingual || data.overallState];
    const fillM = CONDITION_FILLS[data.surfaces.mesial || data.overallState];
    const fillD = CONDITION_FILLS[data.surfaces.distal || data.overallState];
    const fillO = CONDITION_FILLS[data.surfaces.oclusal || data.overallState];

    return (
      <div
        key={toothNum}
        onClick={() => {
          setSelectedTooth(toothNum);
          setToothNote(data.notes || '');
          if (!readOnly) {
            updateToothState(toothNum, selectedCondition, selectedSurface === 'OVERALL' ? undefined : selectedSurface);
          }
        }}
        className={`relative flex flex-col items-center p-0.5 sm:p-1 rounded-lg sm:rounded-xl border transition-all cursor-pointer select-none shrink-0 ${
          isSelected
            ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-950/80 shadow-md ring-2 ring-indigo-500 scale-105 z-10'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-600'
        }`}
      >
        <span className="text-[9px] sm:text-xs font-black text-slate-800 dark:text-slate-200 mb-0.5">
          {formatToothNumber(toothNum, numberingSystem)}
        </span>

        {/* Tooth SVG Surface Diagram */}
        <div className={`relative ${isLarge ? 'w-7 h-7 sm:w-11 sm:h-11 md:w-12 md:h-12' : 'w-5 h-5 sm:w-7 sm:h-7 md:w-9 md:h-9'}`}>
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
        <span className="mt-0.5 text-[8px] sm:text-[9px] font-bold truncate max-w-[34px] sm:max-w-[42px] text-center text-slate-500 dark:text-slate-400">
          {data.overallState}
        </span>
      </div>
    );
  }

  const renderChartBody = (isLarge: boolean = false) => (
    <div className="space-y-4 bg-white dark:bg-slate-900 p-2 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner overflow-x-auto">
      {dentitionType === 'ADULT' ? (
        <>
          {/* Upper Arch */}
          <div>
            <div className="text-center text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2 flex items-center justify-center gap-2">
              <span>Arcada Superior (Maxilar Superior) — 16 Dientes (18 a 28)</span>
            </div>
            <div className="flex items-center justify-between gap-1 w-full min-w-[620px] sm:min-w-0">
              {/* Cuadrante 1 (18-11: 8 Dientes) */}
              <div className="flex items-center justify-end gap-0.5 sm:gap-1 border-r-2 border-indigo-500/40 pr-1 sm:pr-2 flex-1">
                {ADULT_UPPER_RIGHT.map((n) => renderToothSVG(n, isLarge))}
              </div>
              {/* Cuadrante 2 (21-28: 8 Dientes) */}
              <div className="flex items-center justify-start gap-0.5 sm:gap-1 pl-1 sm:pl-2 flex-1">
                {ADULT_UPPER_LEFT.map((n) => renderToothSVG(n, isLarge))}
              </div>
            </div>
          </div>

          <div className="w-full border-t border-dashed border-slate-300 dark:border-slate-700 my-3" />

          {/* Lower Arch */}
          <div>
            <div className="flex items-center justify-between gap-1 w-full min-w-[620px] sm:min-w-0">
              {/* Cuadrante 4 (48-41: 8 Dientes) */}
              <div className="flex items-center justify-end gap-0.5 sm:gap-1 border-r-2 border-indigo-500/40 pr-1 sm:pr-2 flex-1">
                {ADULT_LOWER_RIGHT.map((n) => renderToothSVG(n, isLarge))}
              </div>
              {/* Cuadrante 3 (31-38: 8 Dientes) */}
              <div className="flex items-center justify-start gap-0.5 sm:gap-1 pl-1 sm:pl-2 flex-1">
                {ADULT_LOWER_LEFT.map((n) => renderToothSVG(n, isLarge))}
              </div>
            </div>
            <div className="text-center text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mt-2 flex items-center justify-center gap-2">
              <span>Arcada Inferior (Mandíbula) — 16 Dientes (48 a 38)</span>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Child Upper */}
          <div>
            <div className="text-center text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
              Dentición Decidua Superior — 10 Dientes (55 a 65)
            </div>
            <div className="flex items-center justify-between gap-1 w-full min-w-[450px] sm:min-w-0">
              <div className="flex items-center justify-end gap-0.5 sm:gap-1 border-r-2 border-indigo-500/40 pr-1 sm:pr-2 flex-1">
                {CHILD_UPPER_RIGHT.map((n) => renderToothSVG(n, isLarge))}
              </div>
              <div className="flex items-center justify-start gap-0.5 sm:gap-1 pl-1 sm:pl-2 flex-1">
                {CHILD_UPPER_LEFT.map((n) => renderToothSVG(n, isLarge))}
              </div>
            </div>
          </div>

          <div className="w-full border-t border-dashed border-slate-300 dark:border-slate-700 my-3" />

          {/* Child Lower */}
          <div>
            <div className="flex items-center justify-between gap-1 w-full min-w-[450px] sm:min-w-0">
              <div className="flex items-center justify-end gap-0.5 sm:gap-1 border-r-2 border-indigo-500/40 pr-1 sm:pr-2 flex-1">
                {CHILD_LOWER_RIGHT.map((n) => renderToothSVG(n, isLarge))}
              </div>
              <div className="flex items-center justify-start gap-0.5 sm:gap-1 pl-1 sm:pl-2 flex-1">
                {CHILD_LOWER_LEFT.map((n) => renderToothSVG(n, isLarge))}
              </div>
            </div>
            <div className="text-center text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mt-2">
              Dentición Decidua Inferior — 10 Dientes (85 a 75)
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-5 bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
      {/* Header controls & Palette */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>🦷</span> Odontograma Clínico Interactivo (FDI)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Haz clic en una pieza dental para aplicar la condición o seleccionar la superficie afectada.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Dentition Type */}
          <button
            type="button"
            onClick={() => setDentitionType('ADULT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition border ${
              dentitionType === 'ADULT'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            🦷 Dentición Adulto (32)
          </button>
          <button
            type="button"
            onClick={() => setDentitionType('CHILD')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition border ${
              dentitionType === 'CHILD'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            👶 Dentición Infantil (20)
          </button>

          {/* Numbering System Toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setNumberingSystem('UNIVERSAL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition ${
                numberingSystem === 'UNIVERSAL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              🔢 Universal (1 - 32)
            </button>
            <button
              type="button"
              onClick={() => setNumberingSystem('FDI')}
              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition ${
                numberingSystem === 'FDI'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              🌐 FDI (2 dígitos)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-900 text-white dark:bg-slate-800 hover:bg-slate-800 transition border border-slate-700 flex items-center gap-1.5"
          >
            <span>🔍</span>
            <span>Pantalla Completa</span>
          </button>
        </div>
      </div>

      {/* Palette Toolbar & Surface Selector */}
      {!readOnly && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              1. Elige la Condición / Tratamiento:
            </span>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span>Superficie Objetivo:</span>
              <select
                value={selectedSurface}
                onChange={(e) => setSelectedSurface(e.target.value as any)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200"
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

          <div className="flex flex-wrap gap-2">
            {(Object.keys(CONDITION_COLORS) as ToothCondition[]).map((cond) => {
              const info = CONDITION_COLORS[cond];
              const isSel = selectedCondition === cond;
              return (
                <button
                  key={cond}
                  type="button"
                  onClick={() => setSelectedCondition(cond)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition ${
                    isSel
                      ? 'ring-2 ring-indigo-500 shadow-sm border-indigo-600'
                      : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                  } ${info.bg} ${info.text}`}
                >
                  <span>{cond === 'CARIES' ? '🔴' : cond === 'RESINA' ? '🔵' : cond === 'CORONA' ? '🟡' : cond === 'ENDODONCIA' ? '🟣' : cond === 'AUSENTE' ? '❌' : cond === 'SELLADOR' ? '🟢' : '⚪'}</span>
                  <span>{info.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Chart Body */}
      {renderChartBody(false)}

      {/* Selected Tooth Detail & Note Panel */}
      {selectedTooth && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
              Pieza Dental #{formatToothNumber(selectedTooth, numberingSystem)} (FDI #{selectedTooth} · Universal #{FDI_TO_UNIVERSAL[selectedTooth] || selectedTooth})
            </span>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-700 dark:text-slate-300 font-bold">
              <span>Estado General:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] ${CONDITION_COLORS[getTooth(selectedTooth).overallState].bg} ${CONDITION_COLORS[getTooth(selectedTooth).overallState].text}`}>
                {getTooth(selectedTooth).overallState}
              </span>
            </div>
          </div>

          {!readOnly && (
            <div className="w-full sm:w-1/2 flex items-center gap-2">
              <input
                type="text"
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100"
                placeholder="Observación o tratamiento de esta pieza..."
                value={toothNote}
                onChange={(e) => setToothNote(e.target.value)}
              />
              <button
                type="button"
                onClick={() => saveToothNote(selectedTooth, toothNote)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                Guardar Nota
              </button>
            </div>
          )}
        </div>
      )}

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-xs text-slate-500 font-medium">🔴 Caries</span>
          <p className="text-lg font-black text-red-500">{stats.CARIES || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-xs text-slate-500 font-medium">🔵 Obturados / Resina</span>
          <p className="text-lg font-black text-blue-500">{stats.RESINA || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-xs text-slate-500 font-medium">🟣 Endodoncias</span>
          <p className="text-lg font-black text-purple-500">{stats.ENDODONCIA || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-xs text-slate-500 font-medium">❌ Dientes Ausentes</span>
          <p className="text-lg font-black text-slate-400">{stats.AUSENTE || 0}</p>
        </div>
      </div>

      {/* ── MODAL FULLSCREEN ODONTOGRAM ── */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="relative w-full max-w-6xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>🦷</span> Odontograma Clínico — Vista Completa Ampliada
              </h3>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 transition text-xs flex items-center gap-1"
              >
                ✕ Cerrar Vista
              </button>
            </div>

            {renderChartBody(true)}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-extrabold hover:bg-indigo-700 transition text-xs shadow-sm"
              >
                Listo / Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
