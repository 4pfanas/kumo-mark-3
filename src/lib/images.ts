import type { ImageMetadata } from 'astro';

// Every image in src/assets/images, looked up by base filename (e.g. "hero-coffee").
// A missing file returns undefined so the page renders a fallback instead of failing the build.
const files = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/images/*.{jpg,jpeg,png,webp,avif}',
  { eager: true },
);

export function findImage(name: string): ImageMetadata | undefined {
  for (const [path, mod] of Object.entries(files)) {
    const base = path.split('/').pop()!.replace(/\.[^.]+$/, '');
    if (base === name) return mod.default;
  }
  return undefined;
}
