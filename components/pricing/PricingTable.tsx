'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PLAN_CONFIGS } from '@/lib/plans';

type Props = {
  locale: string;
};

export function PricingTable({ locale }: Props) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="space-y-10">
      {/* Billing Switcher */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm font-black ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-400'}`}>
          Facturación Mensual
        </span>
        <button
          type="button"
          onClick={() => setBillingCycle((b) => (b === 'monthly' ? 'yearly' : 'monthly'))}
          className="relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-slate-700 bg-slate-900 transition-colors duration-200 ease-in-out focus:outline-none"
        >
          <span
            className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md transition duration-200 ease-in-out ${
              billingCycle === 'yearly' ? 'translate-x-7' : 'translate-x-0.5'
            }`}
          />
        </button>
        <span className={`text-sm font-black flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'text-white' : 'text-slate-400'}`}>
          <span>Facturación Anual</span>
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-black text-amber-300 border border-amber-500/30">
            🔥 Ahorra 2 Meses
          </span>
        </span>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-8 lg:grid-cols-3 items-stretch">
        {Object.values(PLAN_CONFIGS).map((plan) => {
          const price = billingCycle === 'monthly' ? plan.priceMonthly : Math.round(plan.priceYearly / 12);

          return (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-3xl p-8 transition-all duration-300 backdrop-blur-md ${
                plan.popular
                  ? 'border-2 border-indigo-500 bg-slate-900/60 shadow-2xl shadow-indigo-500/20 ring-1 ring-indigo-500/50 scale-[1.02]'
                  : 'border border-white/10 bg-slate-900/40 shadow-xl hover:border-white/20'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-4 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-lg border border-indigo-400/30">
                  ⭐ Recomendado / Más Popular
                </div>
              )}

              {/* Plan Header */}
              <div className="space-y-3 pb-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-white">{plan.name}</h3>
                  <span className={`px-2.5 py-1 rounded-full text-xs border ${plan.badgeBg} ${plan.badgeText}`}>
                    {plan.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">{plan.tagline}</p>
                <div className="pt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">${price}</span>
                  <span className="text-sm font-semibold text-slate-400">/ mes</span>
                  {billingCycle === 'yearly' && plan.priceYearly > 0 && (
                    <span className="text-[11px] font-bold text-amber-300 ml-2">
                      (${plan.priceYearly}/año)
                    </span>
                  )}
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="flex-1 py-6 space-y-3">
                <div className="text-xs font-black text-indigo-300 uppercase tracking-wider">
                  Lo que incluye:
                </div>
                <ul className="space-y-2.5 text-xs text-slate-200">
                  {plan.featureHighlights.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="text-emerald-400 font-black shrink-0 text-sm">✓</span>
                      <span className="font-medium leading-tight">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Button */}
              <div className="pt-4 border-t border-white/10">
                <Link
                  href={`/${locale}/sign-up`}
                  className={`w-full inline-flex items-center justify-center py-3.5 px-6 rounded-xl font-black text-sm transition-all duration-200 active:scale-[0.99] shadow-lg ${
                    plan.key === 'BUSINESS'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30'
                      : plan.key === 'PRO'
                      ? 'bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white shadow-amber-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                  }`}
                >
                  {plan.key === 'FREE' ? '🚀 Comenzar Prueba Gratis' : `Elegir ${plan.name}`}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
