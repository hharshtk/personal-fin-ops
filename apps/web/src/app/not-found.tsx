import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-6 py-20">
      <p className="daynum text-[64px] text-red">404</p>
      <h1 className="mt-3 text-xl font-[650]">This page isn&apos;t in your workspace</h1>
      <p className="mt-1 max-w-md text-sm text-ink-3">The link may point to an account, loan or goal that doesn&apos;t exist in the demonstration data. Search with Ctrl K, or go back to the overview.</p>
      <Link href="/" className="btn btn-primary mt-5">
        Go to overview
      </Link>
    </div>
  );
}
