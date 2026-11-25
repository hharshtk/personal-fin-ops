import { TableSkeleton } from "./primitives";

/** Shown while a detail workspace resolves its URL; mirrors the real layout so nothing jumps. */
export function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <div className="px-4 pt-5 md:px-6">
        <div className="skeleton h-5 w-56" />
        <div className="skeleton mt-2.5 h-3 w-80" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-px border-y border-rule bg-rule md:grid-cols-4 [&>*]:bg-paper">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-5 py-4">
            <div className="skeleton h-2.5 w-20" />
            <div className="skeleton mt-3 h-6 w-28" />
          </div>
        ))}
      </div>
      <div className="mt-6">
        <TableSkeleton rows={8} cols={5} />
      </div>
    </div>
  );
}
