import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Numbered pagination: ← Previous | 1 2 3 ... 67 68 | Next →
 * Reusable across CaseLeads, CaseWitnesses, search-result (HCI: consistency).
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems = 0,
  start = 0,
  end = 0,
  itemLabel = 'results',
  className = '',
}) {
  if (totalPages <= 0) return null;

  const simplePages = totalPages <= 7
    ? Array.from({ length: totalPages }, (_, i) => i + 1)
    : [1, 2, 3, '...', totalPages - 1, totalPages];

  return (
    <nav
      className={`flex flex-wrap items-center justify-between gap-4 ${className}`}
      aria-label="Pagination"
    >
      {totalItems > 0 && (
        <p className="text-sm text-slate-600">
          {end > 0 ? (
            <>Showing <strong>{start + 1}-{end}</strong> of <strong>{totalItems}</strong> {itemLabel}</>
          ) : (
            <>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></>
          )}
        </p>
      )}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-[#1a3a4a] focus:ring-offset-1"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Previous</span>
        </button>
        <div className="flex items-center gap-1 mx-1">
          {simplePages.map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 py-1 text-slate-500">...</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-label={`Page ${p}`}
                aria-current={currentPage === p ? 'page' : undefined}
                className={`min-w-[2.25rem] px-2 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1a3a4a] focus:ring-offset-1 ${
                  currentPage === p
                    ? 'bg-[#1a3a4a] text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-[#1a3a4a] focus:ring-offset-1"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}
