// Desktop has no Tailwind dependency; this shadows the root postcss.config.mjs
// so vite doesn't try to load @tailwindcss/postcss from desktop/node_modules.
export default {
  plugins: {},
};
