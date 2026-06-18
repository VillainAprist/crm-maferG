export function KpiCard({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className="border border-[#dbe7e2] rounded-xl p-3 bg-[#f8fcfa] transition-all hover:shadow-md">
      <p className="text-xs text-[#58766d] mb-0.5">{label}</p>
      <strong className={`text-2xl font-bold ${highlight ? 'text-[#1c4a3f]' : 'text-[#1c4a3f]'}`}>
        {value}
      </strong>
    </div>
  )
}
