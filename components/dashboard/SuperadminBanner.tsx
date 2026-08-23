'use client';

import Link from 'next/link';

type Props = {
  tenantName: string;
  tenantSlug: string;
  ownerEmail?: string;
  locale: string;
};

export function SuperadminBanner({ tenantName, tenantSlug, ownerEmail, locale }: Props) {
  return (
    <div className="mb-6 rounded-2xl border border-purple-500/40 bg-gradient-to-r from-slate-900 via-purple-950/70 to-slate-900 p-4 text-purple-100 shadow-xl shadow-purple-950/20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-2xl border border-purple-400/30">
            👑
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-purple-300 border border-purple-400/30">
                Modo Superadministrador
              </span>
              <span className="text-xs text-purple-300/80 font-mono">({tenantSlug})</span>
            </div>
            <p className="text-sm font-bold text-white mt-0.5">
              Gestionando: <span className="text-purple-200 underline decoration-purple-400">{tenantName}</span>
              {ownerEmail && (
                <span className="text-xs text-slate-300 font-normal ml-2">
                  · Dueño: <span className="font-mono text-purple-200">{ownerEmail}</span>
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href={`/${locale}/dashboard`}
            className="rounded-xl border border-purple-400/30 bg-purple-900/40 hover:bg-purple-800/60 px-3 py-1.5 text-xs font-bold text-purple-200 transition shadow-sm flex items-center gap-1.5"
          >
            <span>📋</span> Todos los Negocios
          </Link>
          <Link
            href={`/${locale}/admin`}
            className="rounded-xl border border-indigo-400/30 bg-indigo-900/50 hover:bg-indigo-800/70 px-3 py-1.5 text-xs font-bold text-indigo-200 transition shadow-sm flex items-center gap-1.5"
          >
            <span>⚙️</span> Control Plane (/admin)
          </Link>
        </div>
      </div>
    </div>
  );
}
