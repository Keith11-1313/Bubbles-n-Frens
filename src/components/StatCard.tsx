import type { LucideIcon } from 'lucide-react'
import { MaskIcon } from './MaskIcon'

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  /** Lucide icon component (fallback). */
  icon?: LucideIcon
  /** Monochrome icon asset URL, tinted to accent inside the badge. */
  iconSrc?: string
}

export function StatCard({ title, value, subtitle, icon: Icon, iconSrc }: StatCardProps) {
  return (
    <div className="bg-card border-2 border-navy rounded-app shadow-card-lg p-3 flex flex-col gap-3 min-w-[200px]">
      <div className="bg-sidebar rounded-app px-4 py-3 flex items-center justify-between">
        <span className="text-table-row-text text-sm font-semibold">{title}</span>
        <div className="bg-card-icon rounded-app size-[42px] flex items-center justify-center shrink-0">
          {iconSrc ? (
            <MaskIcon src={iconSrc} className="w-6 h-6 text-accent" />
          ) : Icon ? (
            <Icon size={20} className="text-accent" />
          ) : null}
        </div>
      </div>
      <div className="bg-table-row rounded-app px-4 py-4 flex flex-col gap-1">
        <span className="text-accent font-extrabold text-3xl">{value}</span>
        {subtitle && (
          <span className="text-card-subtitle text-sm font-semibold">{subtitle}</span>
        )}
      </div>
    </div>
  )
}
