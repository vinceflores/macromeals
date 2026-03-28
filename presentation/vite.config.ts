import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  ssr: {
    external: ["ioredis"], // force it to stay server-side only
  },
  optimizeDeps: {
    exclude: ["ioredis"], // <-- this is what stops the client bundle error
  },
  server: {
    watch: {
      usePolling: true,
    },

    port: 5173,
    host: true,
  },
  build: {
    sourcemap: false,
  },
});
