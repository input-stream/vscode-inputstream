import { fileURLToPath, pathToFileURL } from "url";
import { resolve, dirname } from "path";

const filename =
    typeof __filename === "undefined"
        ? fileURLToPath(import.meta.url)
        : __filename;

const importMetaUrl = import.meta.url ?? pathToFileURL(filename).href;

export function polyfillNode() {
    const filter = new RegExp(`^(node:process)`);

    return {
        name: "polyfill-node",
        setup(build) {
            console.log(`polyfill-node <setup>`);
            build.onResolve({ filter }, async ({ path, importer }) => {

            });

            build.initialOptions.inject = build.initialOptions.inject || [];
            build.initialOptions.inject.push(
                resolve(dirname(filename), "./polyfills/process.js"),
            );
            // throw new Error(`hello!`);
        },
    }
}