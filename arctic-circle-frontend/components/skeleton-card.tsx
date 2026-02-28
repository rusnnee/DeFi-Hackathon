export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-[4px] border border-border bg-card p-5 ${className}`}>
      <div className="skeleton-shimmer mb-3 h-3 w-24 rounded-[3px]" />
      <div className="skeleton-shimmer mb-2 h-8 w-40 rounded-[3px]" />
      <div className="skeleton-shimmer h-3 w-32 rounded-[3px]" />
    </div>
  )
}

export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`skeleton-shimmer h-3 rounded-[3px] ${className}`} />
}
