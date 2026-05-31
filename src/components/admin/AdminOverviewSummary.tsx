'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AdminErrorState, AdminLoadingState } from './AdminLoadState';

interface Stats {
  rsvps: {
    total: number;
    attending: number;
    notAttending: number;
    plusOnes: number;
    additionalGuests?: number;
    totalGuests: number;
  };
  guestbook: number;
  photos: number;
  addresses?: {
    total: number;
    linked: number;
  };
}

interface CurrencyTotals {
  totalPaid: number;
  totalBalance: number;
}

interface StandaloneExpenseTotals extends CurrencyTotals {
  totalAmount: number;
}

interface VendorTotals extends CurrencyTotals {
  totalContracted: number;
  countBooked: number;
  countPaid: number;
}

interface GiftTotals {
  totalCash: number;
  totalGifts: number;
  thankYouPending: number;
}

interface AdminOverviewSummaryProps {
  stats: Stats | null;
  standaloneExpenseTotals: StandaloneExpenseTotals;
  vendorTotals: VendorTotals;
  vendorsCount: number;
  timelineEventCount: number;
  milestoneCount: number;
  completedTaskCount: number;
  totalTaskCount: number;
  giftTotals: GiftTotals;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  formatCurrency: (amount: number) => string;
}

function OverviewCard({
  value,
  label,
  detail,
  valueClassName = 'text-cream',
}: {
  value: ReactNode;
  label: string;
  detail?: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="bg-black/50 border border-olive-700 rounded-lg p-6 text-center">
      <div className={`text-4xl font-heading mb-2 ${valueClassName}`}>{value}</div>
      <div className="text-olive-300">{label}</div>
      {detail && <div className="text-olive-400 text-sm mt-1">{detail}</div>}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6" aria-hidden="true">
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} className="bg-black/50 border border-olive-700 rounded-lg p-6 text-center">
          <div className="mx-auto mb-3 h-10 w-24 animate-pulse rounded bg-olive-800/70" />
          <div className="mx-auto h-4 w-28 animate-pulse rounded bg-olive-900/70" />
          <div className="mx-auto mt-2 h-3 w-20 animate-pulse rounded bg-olive-900/50" />
        </div>
      ))}
    </div>
  );
}

export function AdminOverviewSummary({
  stats,
  standaloneExpenseTotals,
  vendorTotals,
  vendorsCount,
  timelineEventCount,
  milestoneCount,
  completedTaskCount,
  totalTaskCount,
  giftTotals,
  isLoading,
  error,
  onRetry,
  formatCurrency,
}: AdminOverviewSummaryProps) {
  const totalCommitted = standaloneExpenseTotals.totalAmount + vendorTotals.totalContracted;
  const totalPaid = standaloneExpenseTotals.totalPaid + vendorTotals.totalPaid;
  const totalDue = standaloneExpenseTotals.totalBalance + vendorTotals.totalBalance;

  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {isLoading ? (
        <>
          <AdminLoadingState label="Loading dashboard summary..." className="py-4" />
          <OverviewSkeleton />
        </>
      ) : error ? (
        <AdminErrorState message={error} onRetry={onRetry} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <OverviewCard
            value={stats?.rsvps.totalGuests || 0}
            label="Total Guests"
            valueClassName="text-gold-500"
            detail={`${stats?.rsvps.attending || 0} RSVPs + ${stats?.rsvps.additionalGuests || stats?.rsvps.plusOnes || 0} guests`}
          />
          <OverviewCard value={stats?.rsvps.attending || 0} label="Attending" valueClassName="text-green-500" />
          <OverviewCard value={stats?.rsvps.notAttending || 0} label="Not Attending" valueClassName="text-red-400" />
          <OverviewCard value={stats?.rsvps.total || 0} label="Total RSVPs" />
          <OverviewCard value={stats?.guestbook || 0} label="Guestbook Entries" valueClassName="text-purple-400" />
          <OverviewCard value={stats?.photos || 0} label="Photos Uploaded" valueClassName="text-blue-400" />
          <OverviewCard
            value={stats?.addresses?.total || 0}
            label="Addresses Collected"
            valueClassName="text-teal-400"
            detail={`${stats?.addresses?.linked || 0} linked to RSVPs`}
          />
          <OverviewCard
            value={formatCurrency(totalCommitted)}
            label="Total Committed"
            valueClassName="text-gold-500"
            detail={(
              <>
                <span className="text-green-400">{formatCurrency(totalPaid)} paid</span>
                {totalDue > 0 && <span className="text-yellow-400"> · {formatCurrency(totalDue)} due</span>}
              </>
            )}
          />
          <OverviewCard
            value={vendorsCount}
            label="Vendors"
            valueClassName="text-orange-400"
            detail={(
              <>
                <span className="text-green-400">{vendorTotals.countPaid + vendorTotals.countBooked} booked</span>
                {vendorTotals.totalBalance > 0 && <span className="text-yellow-400"> · {formatCurrency(vendorTotals.totalBalance)} due</span>}
              </>
            )}
          />
          <OverviewCard
            value={timelineEventCount}
            label="Timeline Events"
            valueClassName="text-indigo-400"
            detail={`${milestoneCount} key moments`}
          />
          <OverviewCard
            value={`${completedTaskCount}/${totalTaskCount}`}
            label="Tasks Complete"
            valueClassName="text-cyan-400"
            detail={`${Math.max(totalTaskCount - completedTaskCount, 0)} pending`}
          />
          <OverviewCard
            value={formatCurrency(giftTotals.totalCash)}
            label="Gifts Received"
            valueClassName="text-pink-400"
            detail={`${giftTotals.totalGifts} gifts · ${giftTotals.thankYouPending} thank yous pending`}
          />
        </div>
      )}
    </motion.div>
  );
}
