/**
 * @file PostCSS configuration.
 *
 * Tailwind v4 plugs in via `@tailwindcss/postcss`. Tokens are declared via
 * `@theme` inside `app/globals.css` rather than a `tailwind.config.*` file.
 */

const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
