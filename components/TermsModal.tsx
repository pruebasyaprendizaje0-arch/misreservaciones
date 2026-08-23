'use client';

import { useState } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function TermsModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-slate-700 bg-slate-900 text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚖️</span>
            <div>
              <h3 className="text-base font-extrabold text-white">
                Términos, Condiciones y Marco Legal (Ecuador)
              </h3>
              <p className="text-xs text-slate-400">
                Conforme a la LOPDP y Ley de Comercio Electrónico de la República del Ecuador
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs leading-relaxed text-slate-300">
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-1.5">
              <span>📜</span> 1. Aceptación de Términos y Condiciones
            </h4>
            <p>
              Al registrarse, crear una cuenta o realizar una reserva a través de la plataforma <strong>misreservaciones.com</strong>, el usuario declara ser mayor de edad con capacidad legal para contratar, expresando su aceptación plena y sin reservas de todos los términos establecidos bajo la legislación vigente de la República del Ecuador.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-1.5">
              <span>🔒</span> 2. Protección de Datos Personales (Ley Orgánica LOPDP Ecuador)
            </h4>
            <p>
              En cumplimiento con la <strong>Ley Orgánica de Protección de Datos Personales (LOPDP)</strong> publicada en el Registro Oficial Suplemento 459 de Ecuador, le informamos que sus datos personales (nombres, cédula/identificación, correo electrónico, teléfono y datos de reserva) serán tratados con absoluta confidencialidad y utilizados exclusivamente para:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Gestión, confirmación y procesamiento de reservas directas con el establecimiento.</li>
              <li>Emisión de comprobantes, facturas o notificaciones operativas vía WhatsApp o Email.</li>
              <li>Cumplimiento de obligaciones legales, tributarias (SRI) y regulatorias en Ecuador.</li>
            </ul>
            <p className="text-slate-400">
              El usuario podrá ejercer sus derechos de acceso, eliminación, rectificación y oposición enviando una solicitud formal a la administración del sistema.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-1.5">
              <span>💻</span> 3. Ley de Comercio Electrónico y Firmas Electrónicas (Ley 67)
            </h4>
            <p>
              De conformidad con la <strong>Ley de Comercio Electrónico, Firmas Electrónicas y Mensajes de Datos de Ecuador</strong>, las transacciones, confirmaciones enviadas por la plataforma y la aceptación de casillas electrónicas poseen plena validez legal y valor probatorio equivalente a un documento físico firmado.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-1.5">
              <span>🏨</span> 4. Responsabilidad de Reservas y Cancelaciones
            </h4>
            <p>
              Cada negocio o establecimiento comercial registrado en la plataforma es responsable directo de la calidad, prestación de servicios, disponibilidad y políticas específicas de reembolso o cancelación comunicadas al usuario. La plataforma actúa como facilitador tecnológico de reservación directa.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-6 py-4 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-400">
            🇪🇨 Normativa Legal Vigente en la República del Ecuador
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-indigo-500"
          >
            Entendido y Aceptado
          </button>
        </div>
      </div>
    </div>
  );
}
