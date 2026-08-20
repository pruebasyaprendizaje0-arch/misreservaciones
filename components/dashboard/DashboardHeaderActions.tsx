'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { NewReservationModal } from './NewReservationModal';
import { PricingRulesModal } from './PricingRulesModal';
import { BlockDatesModal } from './BlockDatesModal';

type Props = {
  slug: string;
  locale: string;
};

export function DashboardHeaderActions({ slug, locale }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <ThemeToggle />
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <span>➕</span> Nueva Reserva
        </button>

        {/* Pricing Rules & Block Dates Modals */}
        <PricingRulesModal slug={slug} />
        <BlockDatesModal slug={slug} />

        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm transition"
        >
          🏠 App principal
        </Link>
        <a
          href={`/${locale}/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm transition"
        >
          🔗 Ver página pública
        </a>
      </div>

      <NewReservationModal
        slug={slug}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
