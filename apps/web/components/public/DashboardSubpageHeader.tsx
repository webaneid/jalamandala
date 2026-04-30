export function DashboardSubpageHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div className="relative overflow-hidden bg-[#134397] px-5 pb-8 pt-12">
      <div className="absolute -right-8 -top-8 size-40 rounded-full bg-white/5" />
      <div className="absolute -left-10 top-6 size-28 rounded-full bg-white/5" />
      <div className="relative">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-blue-200">{subtitle}</p>}
      </div>
    </div>
  )
}
