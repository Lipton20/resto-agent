export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-40 bg-gray-200 rounded-lg" />
      <div className="h-64 bg-gray-200 rounded-xl" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 bg-gray-200 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
