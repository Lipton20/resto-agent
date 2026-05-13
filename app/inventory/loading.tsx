export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-32 bg-gray-200 rounded-lg" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="h-10 bg-gray-100 border-b border-gray-200" />
          {[...Array(4)].map((_, j) => (
            <div key={j} className="flex gap-4 px-4 py-3 border-b border-gray-50">
              <div className="h-5 w-40 bg-gray-200 rounded" />
              <div className="h-5 w-16 bg-gray-200 rounded" />
              <div className="h-5 w-16 bg-gray-200 rounded" />
              <div className="h-5 w-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
