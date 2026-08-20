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
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  placeholder?: string;
  aspectRatio?: 'square' | 'banner' | 'video';
};

type Props = SingleProps | MultiProps;

export function ImageUploader(props: Props) {
  const { label, placeholder = 'Subir imagen', aspectRatio = 'video' } = props;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        const uploadedUrls: string[] = [];
        for (let i = 0; i < files.length; i++) {
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
        props.onChange([...props.value, ...uploadedUrls]);
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

  function handleRemoveSingle() {
    if (!props.multiple) props.onChange('');
  }

  function handleRemoveMulti(indexToRemove: number) {
    if (props.multiple) {
      props.onChange(props.value.filter((_, idx) => idx !== indexToRemove));
    }
  }

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-semibold text-slate-300">{label}</label>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={props.multiple}
        className="hidden"
        onChange={handleFileSelect}
      />

      {!props.multiple ? (
        // ── Single Image Mode (Logo or Cover) ──────────────────────
        <div className="flex items-center gap-4">
          {props.value ? (
            <div className={`relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 group ${aspectClass}`}>
              <img src={props.value} alt="Uploaded" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow"
                >
                  ✏️ Cambiar
                </button>
                <button
                  type="button"
                  onClick={handleRemoveSingle}
                  className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow"
                >
                  🗑️
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center p-4 text-slate-400 hover:text-indigo-400 bg-slate-800/50 hover:bg-slate-800 transition-all cursor-pointer ${aspectClass}`}
            >
              {uploading ? (
                <span className="text-xs font-semibold animate-pulse">Subiendo...</span>
              ) : (
                <>
                  <span className="text-2xl mb-1">📷</span>
                  <span className="text-xs font-semibold text-center">{placeholder}</span>
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        // ── Multi Image Mode (Gallery / Common Areas / Room Photos) ─
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {props.value.map((url, idx) => (
              <div key={url + idx} className="relative w-36 h-28 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 group">
                <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveMulti(idx)}
                  className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-600 text-white text-xs p-1 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Eliminar foto"
                >
                  ✕
                </button>
              </div>
            ))}

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
                  <span className="text-2xl mb-1">🖼️</span>
                  <span className="text-xs font-semibold text-center">+ Agregar fotos</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs font-semibold text-red-400 mt-1">⚠ {error}</p>}
    </div>
  );
}
