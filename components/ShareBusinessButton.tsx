'use client';

import React, { useState } from 'react';

interface ShareBusinessButtonProps {
  tenantName: string;
  tenantSlug: string;
  className?: string;
  variant?: 'button' | 'badge' | 'hero';
}

export function ShareBusinessButton({
  tenantName,
  tenantSlug,
  className,
  variant = 'button',
}: ShareBusinessButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const getShareUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/es/${tenantSlug}`;
    }
    return `https://misreservaciones.com/es/${tenantSlug}`;
  };

  const handleShare = async () => {
    const url = getShareUrl();
    const shareData = {
      title: tenantName,
      text: `¡Haz tu reserva en línea directamente en ${tenantName}!`,
      url: url,
    };

    if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // Fallback to modal if cancelled or unsupported
      }
    }

    setShowModal(true);
  };

  const copyUrl = () => {
    const url = getShareUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const defaultStyle =
    variant === 'hero'
      ? 'inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-extrabold text-sm py-3.5 px-6 transition shadow-lg shadow-indigo-950/30 active:scale-95'
      : 'inline-flex items-center gap-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white font-extrabold text-xs py-2 px-4 transition border border-slate-700 shadow-sm active:scale-95';

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        className={className || defaultStyle}
      >
        <span>🔗</span>
        <span>Compartir Negocio</span>
      </button>

      {/* Share Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-left space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>🔗</span> Compartir {tenantName}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold hover:bg-slate-200 transition flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Comparte el enlace de tu perfil de reservas con tus clientes por WhatsApp, Facebook o mediante enlace directo.
            </p>

            {/* Quick Share Buttons */}
            <div className="space-y-2.5">
              {/* WhatsApp Share */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`¡Hola! Haz tu reserva en línea en ${tenantName} aquí: ${getShareUrl()}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">💬</span>
                  <span>Compartir en WhatsApp</span>
                </div>
                <span>→</span>
              </a>

              {/* Facebook Share */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">📘</span>
                  <span>Compartir en Facebook</span>
                </div>
                <span>→</span>
              </a>

              {/* Copy Link */}
              <button
                type="button"
                onClick={copyUrl}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-900 dark:text-slate-100 font-extrabold text-xs transition shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">📋</span>
                  <span>{copied ? '¡Enlace Copiado!' : 'Copiar Enlace Directo'}</span>
                </div>
                <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{copied ? '✓ Copiado' : 'Copiar'}</span>
              </button>
            </div>

            {/* Direct URL Input */}
            <div className="pt-2">
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Enlace directo del perfil:</label>
              <input
                type="text"
                readOnly
                value={getShareUrl()}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 select-all"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
