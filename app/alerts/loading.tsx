export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-32 bg-gray-200 rounded-lg" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3">
            <div className="h-8 w-8 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-gray-200 rounded" />
              <div className="h-3 w-full bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
