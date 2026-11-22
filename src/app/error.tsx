"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="px-6 py-20">
      <h1 className="text-xl font-[650]">This workspace couldn&apos;t load</h1>
      <p className="mt-1 max-w-md text-sm text-ink-3">Something went wrong while preparing the figures. Your other workspaces are unaffected. Try again, and if it keeps happening, reload the page.</p>
      <button type="button" onClick={reset} className="btn btn-primary mt-5">
        Try again
      </button>
    </div>
  );
}
