import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Bare config is correct for this app: no ISR / `use cache` / revalidation, so
// no R2 incremental cache or queue bindings are needed. If revalidation is ever
// added, configure r2IncrementalCache per the adapter's get-started template.
export default defineCloudflareConfig();
