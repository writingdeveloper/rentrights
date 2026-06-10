# Docker self-host (archived alternative)

The **supported production path is Cloudflare Workers** via the OpenNext
adapter (`npm run deploy`), serving https://rentrights.soursea.io. This Docker
setup is kept as a self-host escape hatch; it is **not exercised by CI or QA**
and may rot.

From the repo root:

```sh
docker compose -f deploy/docker/docker-compose.yml up -d --build
```

Notes:
- `.dockerignore` stays at the repo root (the build context root).
- `NEXT_PUBLIC_SITE_URL` is inlined at build time; the committed
  `.env.production` provides the Cloudflare origin, so pass the build arg if
  you self-host on a different domain.
- Rate limiting: the in-app limiter is best-effort — put a `limit_req`-style
  rule on your reverse proxy.
