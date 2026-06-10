// Reuse the Open Graph card as the Twitter/X image (no duplicate art).
// Route segment config is not inherited via re-export — declare it here too.
export const dynamic = 'force-static';
export { default, alt, size, contentType } from './opengraph-image';
