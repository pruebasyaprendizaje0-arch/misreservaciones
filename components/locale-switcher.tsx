'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';

type Props = { currentLocale: string };

export function LocaleSwitcher({ currentLocale }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function switchTo(loc: string) {
    const segments = pathname.split('/');
    if (segments[1] === currentLocale) {
      segments[1] = loc;
    } else {
      segments.splice(1, 0, loc);
    }
    const next = segments.join('/') || `/${loc}`;
    startTransition(() => router.push(next));
  }

  return (
    <select
      className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
      value={currentLocale}
      onChange={(e) => switchTo(e.target.value)}
      disabled={pending}
    >
      <option value="es">ES</option>
      <option value="en">EN</option>
    </select>
  );
}
