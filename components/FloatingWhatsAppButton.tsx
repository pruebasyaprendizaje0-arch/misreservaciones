'use client';

import React, { useState } from 'react';

interface FloatingWhatsAppButtonProps {
  phone?: string | null;
  businessName: string;
  locale?: string;
}

export function FloatingWhatsAppButton({
  phone,
  businessName,
  locale = 'es',
}: FloatingWhatsAppButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  if (!phone) return null;

  // Clean and normalize phone number
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (!cleanPhone) return null;

  // Format international number (default Ecuador +593 if starting with 0 or 9 digits)
  let formattedNumber = cleanPhone;
  if (cleanPhone.startsWith('0')) {
    formattedNumber = `593${cleanPhone.substring(1)}`;
  } else if (!cleanPhone.startsWith('593') && cleanPhone.length === 9) {
    formattedNumber = `593${cleanPhone}`;
  }

  const isEn = locale === 'en';
  const defaultMessage = isEn
    ? `Hello ${businessName}, I would like more information about your services and reservations.`
    : `¡Hola ${businessName}! Quisiera más información sobre sus servicios y reservas.`;

  const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(defaultMessage)}`;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center group">
      {/* Tooltip / Speech Bubble on hover */}
      <div
        className={`hidden sm:flex items-center mr-3 px-3.5 py-2 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs font-semibold shadow-2xl border border-slate-700/60 backdrop-blur-md transition-all duration-300 pointer-events-none ${
          isHovered
            ? 'opacity-100 translate-x-0 scale-100'
            : 'opacity-0 translate-x-2 scale-95'
        }`}
      >
        <span className="mr-1.5 inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>{isEn ? 'Chat with us on WhatsApp' : '¿Dudas? Chatea con nosotros'}</span>
        {/* Triangle arrow */}
        <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-slate-900/95 dark:border-l-slate-800/95" />
      </div>

      {/* Floating Action Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Contactar a ${businessName} por WhatsApp`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white shadow-2xl shadow-emerald-950/40 hover:shadow-emerald-500/50 hover:scale-110 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-emerald-400/40"
      >
        {/* Pulsing ring */}
        <span className="absolute -inset-1 rounded-full bg-[#25D366] opacity-30 animate-ping pointer-events-none" />

        {/* Official WhatsApp SVG Icon */}
        <svg
          className="w-7 h-7 sm:w-8 sm:h-8 fill-current drop-shadow-sm relative z-10"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>

        {/* Small badge dot on mobile */}
        <span className="sm:hidden absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full" />
      </a>
    </div>
  );
}
