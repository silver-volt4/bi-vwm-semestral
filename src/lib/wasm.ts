import loadWasm, { initialize } from "./wasm/src_wasm";
export { stem } from "./wasm/src_wasm";

async function init() {
    await loadWasm();
    initialize();
    console.log("Initialized WASM components.");
}

await init();