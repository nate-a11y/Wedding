'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export interface LiveHubAction {
  title: string;
  description: string;
  href: string;
  icon: string;
  eyebrow: string;
  primary?: boolean;
  command?: string;
}

export function ScanActionCard({ action, index }: { action: LiveHubAction; index: number }) {
  const stepLabel = String(index + 1).padStart(2, '0');

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * index }}
      className={action.primary ? 'sm:col-span-2' : undefined}
    >
      <Link
        href={action.href}
        className={`group relative block h-full overflow-hidden rounded-3xl border p-5 shadow-elegant outline-none transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-gold-400 sm:p-6 ${
          action.primary
            ? 'border-gold-400/80 bg-gradient-to-br from-gold-500/25 via-black/80 to-olive-900/80 hover:border-gold-300'
            : 'border-olive-600 bg-black/65 hover:border-gold-500/80 hover:bg-olive-900/45'
        }`}
      >
        <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-olive-200">
          {stepLabel}
        </div>
        <div className="flex min-h-36 flex-col justify-between gap-5 sm:min-h-40">
          <div className="flex items-start gap-4 pr-10">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-gold-500/30 bg-olive-900/80 text-4xl shadow-inner group-hover:border-gold-400/70">
              {action.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-gold-300">
                {action.eyebrow}
              </p>
              <h2 className="mb-2 font-heading text-3xl leading-tight text-cream sm:text-4xl">{action.title}</h2>
              <p className="mb-0 text-sm leading-relaxed text-olive-100 sm:text-base">{action.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <span className="rounded-full bg-cream/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-olive-100">
              {action.command ?? 'Tap to open'}
            </span>
            <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gold-500 px-4 py-2 text-sm font-extrabold text-black transition-colors group-hover:bg-gold-300">
              Open
              <span aria-hidden="true">→</span>
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
