import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Static output: deploy the `dist` folder to Cloudflare Pages (build command: npm run build).
export default defineConfig({
  // Replace with the real domain when deployed (used for canonical, hreflang and OG URLs).
  site: 'https://kumo-dubai.pages.dev',
  output: 'static',
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
  },
});
