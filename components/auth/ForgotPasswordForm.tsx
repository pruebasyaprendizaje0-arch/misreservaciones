'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export function ForgotPasswordForm() {
  const locale = useLocale();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [debugToken, setDebugToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Password rules validation
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordScore = [hasMinLength, hasUpper, hasLower, hasNumber].filter(Boolean).length;
  const isPasswordValid = passwordScore === 4;

  async function handleRequestToken(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    setLoading(false);
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(json.message || 'Error al solicitar el restablecimiento');
      return;
    }

    setMessage(json.message);
    if (json.debugToken) {
      setDebugToken(json.debugToken);
      setToken(json.debugToken);
    }
    setStep(2);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (!isPasswordValid) {
      setError('La contraseña debe cumplir con todos los requisitos de seguridad');
      return;
    }

    setLoading(true);

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, newPassword }),
    });

    setLoading(false);
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(json.message || 'Error al restablecer la contraseña');
      return;
    }

    setMessage(json.message);
    setStep(3);
  }

  return (
    <div className="space-y-5 text-left">
      {/* Step 1: Request PIN */}
      {step === 1 && (
        <form onSubmit={handleRequestToken} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-indigo-300 mb-1.5" htmlFor="email">
              Correo Electrónico Registrado *
            </label>
            <input
              id="email"
              type="email"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 shadow-inner focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition font-medium"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/60 p-3.5 text-xs text-rose-200 font-bold shadow-lg">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full py-3.5 text-sm font-black rounded-xl shadow-xl transition-all duration-200 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Generando PIN…' : '📩 Enviar PIN de Recuperación'}
          </button>
        </form>
      )}

      {/* Step 2: Input PIN & New Password */}
      {step === 2 && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          {message && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3.5 text-xs text-emerald-200 font-medium">
              💡 {message}
            </div>
          )}

          {debugToken && (
            <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/70 p-3 text-xs text-indigo-200">
              🔑 PIN de pruebas generado: <strong className="text-white font-mono text-sm tracking-widest">{debugToken}</strong>
            </div>
          )}

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-indigo-300 mb-1.5" htmlFor="token">
              Código PIN de 6 Dígitos *
            </label>
            <input
              id="token"
              type="text"
              required
              maxLength={6}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-center text-lg font-mono tracking-widest text-white placeholder-slate-500 shadow-inner focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition"
              placeholder="123456"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-indigo-300 mb-1.5" htmlFor="newPassword">
              Nueva Contraseña *
            </label>
            <input
              id="newPassword"
              type="password"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 shadow-inner focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition font-medium"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            {/* Dynamic Password Strength Indicator */}
            {newPassword.length > 0 && (
              <div className="mt-2.5 space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs shadow-inner">
                <div className="flex items-center justify-between text-slate-200 font-bold">
                  <span>Fortaleza:</span>
                  <span className={`font-black px-2 py-0.5 rounded-md ${
                    passwordScore === 4 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : passwordScore >= 2 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {passwordScore === 4 ? '🔒 Muy Segura' : passwordScore >= 2 ? '⚠️ Media' : '❌ Débil'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1 font-semibold">
                  <span className={hasMinLength ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {hasMinLength ? '✓' : '○'} Mínimo 8 caract.
                  </span>
                  <span className={hasUpper ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {hasUpper ? '✓' : '○'} 1 Mayúscula
                  </span>
                  <span className={hasLower ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {hasLower ? '✓' : '○'} 1 Minúscula
                  </span>
                  <span className={hasNumber ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {hasNumber ? '✓' : '○'} 1 Número
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-indigo-300 mb-1.5" htmlFor="confirmPassword">
              Confirmar Nueva Contraseña *
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 shadow-inner focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition font-medium"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/60 p-3.5 text-xs text-rose-200 font-bold shadow-lg">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !token || !isPasswordValid || newPassword !== confirmPassword}
            className="w-full py-3.5 text-sm font-black rounded-xl shadow-xl transition-all duration-200 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Guardando Nueva Contraseña…' : '🔐 Guardar Nueva Contraseña'}
          </button>
        </form>
      )}

      {/* Step 3: Success Confirmation */}
      {step === 3 && (
        <div className="space-y-4 text-center">
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/60 p-6 space-y-2">
            <span className="text-3xl">🎉</span>
            <h3 className="text-lg font-black text-white">¡Contraseña Restablecida!</h3>
            <p className="text-xs text-emerald-200 leading-relaxed font-medium">
              Tu contraseña ha sido actualizada con éxito. Ya puedes ingresar al panel de tu negocio.
            </p>
          </div>

          <Link
            href={`/${locale}/sign-in`}
            className="block w-full py-3.5 text-center text-sm font-black rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 transition"
          >
            🔑 Ir a Iniciar Sesión
          </Link>
        </div>
      )}

      <div className="pt-2 text-center border-t border-slate-800/80">
        <Link
          href={`/${locale}/sign-in`}
          className="text-xs font-bold text-slate-400 hover:text-indigo-300 transition"
        >
          ← Volver a Iniciar Sesión
        </Link>
      </div>
    </div>
  );
}
