'use client';

import { useState, useRef } from 'react';

type SingleProps = {
  multiple?: false;
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  aspectRatio?: 'square' | 'banner' | 'video';
};

type MultiProps = {
  multiple: true;
  maxFiles?: number;
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  placeholder?: string;
  aspectRatio?: 'square' | 'banner' | 'video';
};

type Props = SingleProps | MultiProps;

export function ImageUploader(props: Props) {
  const { label, placeholder = 'Subir o ingresar imagen', aspectRatio = 'video' } = props;
  const maxFiles = props.multiple ? props.maxFiles : 1;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const aspectClass =
    aspectRatio === 'square'
      ? 'w-28 h-28'
      : aspectRatio === 'banner'
      ? 'w-full h-36'
      : 'w-44 h-28';

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      if (props.multiple) {
        const remainingSlots = props.maxFiles ? props.maxFiles - props.value.length : files.length;
        if (remainingSlots <= 0) {
          setError(`Máximo ${props.maxFiles} fotos permitidas.`);
          setUploading(false);
          return;
        }

        const countToUpload = Math.min(files.length, remainingSlots);
        const uploadedUrls: string[] = [];
        for (let i = 0; i < countToUpload; i++) {
          const file = files[i];
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          const data = await res.json();
          if (res.ok && data.url) {
            uploadedUrls.push(data.url);
          } else {
            throw new Error(data.error || 'Error al subir la imagen');
          }
        }
        const updated = [...props.value, ...uploadedUrls];
        props.onChange(props.maxFiles ? updated.slice(0, props.maxFiles) : updated);
      } else {
        const file = files[0];
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok && data.url) {
          props.onChange(data.url);
        } else {
          throw new Error(data.error || 'Error al subir la imagen');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al subir');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleAddUrl() {
    if (!customUrl.trim()) return;
    const url = customUrl.trim();
    if (props.multiple) {
      if (props.maxFiles && props.value.length >= props.maxFiles) {
        setError(`Máximo ${props.maxFiles} fotos permitidas.`);
        return;
      }
      props.onChange([...props.value, url]);
    } else {
      props.onChange(url);
    }
    setCustomUrl('');
    setShowUrlInput(false);
    setError(null);
  }

  function handleRemoveSingle() {
    if (!props.multiple) props.onChange('');
  }

  function handleRemoveMulti(indexToRemove: number) {
    if (props.multiple) {
      props.onChange(props.value.filter((_, idx) => idx !== indexToRemove));
    }
  }

  return (
    <div className="space-y-3">
      {label && <label className="block text-sm font-semibold text-slate-300">{label}</label>}

      {/* Input de archivo / cámara oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={props.multiple}
        className="hidden"
        onChange={handleFileSelect}
      />

      {!props.multiple ? (
        // ── Single Image Mode (Logo / Cover / Room Single Photo) ────────
        <div className="space-y-3">
          {props.value ? (
            <div className={`relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 group ${aspectClass}`}>
              <img src={props.value} alt="Uploaded" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity p-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow flex items-center gap-1"
                  title="Cambiar foto / Tomar otra"
                >
                  📷 Cambiar
                </button>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold shadow flex items-center gap-1"
                  title="Editar por URL web"
                >
                  🔗 URL
                </button>
                <button
                  type="button"
                  onClick={handleRemoveSingle}
                  className="px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow"
                  title="Eliminar foto"
                >
                  🗑️
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center p-3 text-slate-400 hover:text-indigo-400 bg-slate-800/50 hover:bg-slate-800 transition-all cursor-pointer ${aspectClass}`}
              >
                {uploading ? (
                  <span className="text-xs font-semibold animate-pulse">Subiendo...</span>
                ) : (
                  <>
                    <span className="text-2xl mb-1">📷</span>
                    <span className="text-xs font-semibold text-center">{placeholder}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">(Cámara o Galería)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1.5"
              >
                <span>🔗</span>
                <span>Pegar URL web</span>
              </button>
            </div>
          )}

          {/* Formulario desplegable para pegar URL web */}
          {showUrlInput && (
            <div className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-slate-900 p-2.5 text-xs max-w-md shadow-lg">
              <input
                type="url"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                placeholder="https://ejemplo.com/mi-imagen.jpg"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
              />
              <button
                type="button"
                onClick={handleAddUrl}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 transition shrink-0"
              >
                Guardar URL
              </button>
              <button
                type="button"
                onClick={() => setShowUrlInput(false)}
                className="text-slate-400 hover:text-white px-1 text-sm"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      ) : (
        // ── Multi Image Mode (Gallery / Common Areas max 3 photos) ─────
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            {props.value.map((url, idx) => (
              <div key={url + idx} className="relative w-36 h-28 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 group">
                <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleRemoveMulti(idx)}
                    className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow"
                    title="Eliminar foto"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}

            {(!props.maxFiles || props.value.length < props.maxFiles) && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-36 h-28 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center p-3 text-slate-400 hover:text-indigo-400 bg-slate-800/50 hover:bg-slate-800 transition-all cursor-pointer"
                >
                  {uploading ? (
                    <span className="text-xs font-semibold animate-pulse">Subiendo...</span>
                  ) : (
                    <>
                      <span className="text-2xl mb-1">📷</span>
                      <span className="text-xs font-semibold text-center">
                        + Foto {props.maxFiles ? `(${props.value.length}/${props.maxFiles})` : ''}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Cámara / Archivo</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="w-36 text-center py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white transition"
                >
                  🔗 Pegar URL web
                </button>
              </div>
            )}
          </div>

          {/* Formulario desplegable para pegar URL web */}
          {showUrlInput && (
            <div className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-slate-900 p-2.5 text-xs max-w-md shadow-lg">
              <input
                type="url"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                placeholder="https://ejemplo.com/foto-area-comun.jpg"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
              />
              <button
                type="button"
                onClick={handleAddUrl}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 transition shrink-0"
              >
                Agregar URL
              </button>
              <button
                type="button"
                onClick={() => setShowUrlInput(false)}
                className="text-slate-400 hover:text-white px-1 text-sm"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs font-semibold text-rose-400 mt-1">⚠ {error}</p>}
    </div>
  );
}
