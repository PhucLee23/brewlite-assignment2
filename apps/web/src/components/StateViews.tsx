// Trạng thái dùng chung cho mọi trang dữ liệu: đang tải, trống, lỗi (NFR-08)

export function LoadingGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-label="Đang tải" role="status">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-latte bg-white">
          <div className="aspect-square bg-latte" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-3/4 rounded bg-latte" />
            <div className="h-4 w-1/3 rounded bg-latte" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ message, children }: { message: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-latte bg-white p-10 text-center">
      <p className="text-roast">{message}</p>
      {children}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center" role="alert">
      <p className="text-red-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 min-h-11 rounded-xl bg-espresso px-5 font-medium text-white hover:bg-roast"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}
