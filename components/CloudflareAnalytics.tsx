// Cloudflare Web Analytics beacon (cookieless RUM — no consent banner needed).
// The token is public by design: it ships in the HTML of every page. Rendered
// as a native deferred <script> so it lands in the server HTML; the component
// renders nothing when the token env var is absent (local dev, self-host).
export function CloudflareAnalytics() {
  const token = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;
  if (!token) return null;
  return (
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={`{"token": "${token}"}`}
    />
  );
}
