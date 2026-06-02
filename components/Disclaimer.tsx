export function Disclaimer({ lastVerified }: { lastVerified: string }) {
  return (
    <p className="mt-6 text-xs text-gray-500">
      ⚠️ This is an estimate based on public records, not a lookup from LAHD&apos;s registry, and is not legal advice.
      Always confirm with LAHD before acting. Legal figures last verified {lastVerified}.
    </p>
  );
}
