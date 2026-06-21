export function KpiCard({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className={`border rounded-2xl p-4 transition-all duration-300 hover-card-trigger ${
      highlight 
        ? 'border-red-200 bg-red-50/60 shadow-sm animate-pulse-slow' 
        : 'border-border-primary bg-white'
    }`}>
      <p className="text-xs text-secondary font-medium mb-1">{label}</p>
      <strong className={`text-3xl font-extrabold tracking-tight ${
        highlight ? 'text-red-600' : 'text-primary'
      }`}>
        {value}
      </strong>
    </div>
  )
}
