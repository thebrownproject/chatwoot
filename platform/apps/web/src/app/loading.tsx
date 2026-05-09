export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex items-center gap-2 text-slate-500">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  );
}
