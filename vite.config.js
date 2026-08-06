import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
    build: {
        outDir: "public",
        emptyOutDir: false,
        rollupOptions: {
            input: {
                app: path.resolve(__dirname, "src/js/app.js"),
            },
            output: {
                entryFileNames: "js/[name].js",
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name.endsWith(".css"))
                        return "css/[name].[ext]";
                    return "assets/[name].[ext]";
                },
            },
        },
    },
});