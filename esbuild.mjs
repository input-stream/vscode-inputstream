import { build } from "esbuild";
import { polyfillNode } from "./esbuild-polyfill.mjs";

await build({
    entryPoints: ["./src/extension.js"],
    bundle: true,
    outfile: "out/main.js",
    plugins: [
        polyfillNode({
            // Options (optional)
        }),
    ],
    format: 'cjs',
    platform: 'browser',
    external: ['vscode'],
});
