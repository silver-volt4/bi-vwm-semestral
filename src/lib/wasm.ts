import { clearIndex, getDocument, getDocumentList, insertWeightsToIndex, type Schema } from "./database.svelte";
import loadWasm, { IndexBuilder, initialize } from "./wasm/src_wasm";

async function init() {
    console.log("Loading WASM");
    await loadWasm();
    initialize();
    console.log("Initialized WASM components.");
}

await init();

export interface IndexBuildStatus {
    importDocumentsPhase?: {
        lastBuiltDocument: Schema.DocumentList,
        termCount: number,
    },
    processTermsPhase?: {
        lastProcessedTerm: string,
    },

    processedCount: number,
    totalCount: number
}

export async function buildIndex(statusProgress?: (status: IndexBuildStatus) => Promise<void>) {
    console.info("Started index build.");
    let indexBuilder = new IndexBuilder();

    let documents = await getDocumentList();
    let processedCount = 0;
    let termCount = 0;
    console.info("Started adding documents.");
    for (let [key, documentFromList] of documents) {
        let document = await getDocument(key);
        if (!document) {
            continue;
        }

        ++processedCount;
        indexBuilder.add_document(key, document.content);
        statusProgress?.({
            importDocumentsPhase: {
                lastBuiltDocument: documentFromList,
                termCount: termCount = indexBuilder.stats(),
            },
            processedCount: processedCount,
            totalCount: documents.size
        })
    }
    console.info("Finished adding documents.");

    await clearIndex();
    console.info("Cleared index table.");

    console.info("Started calculating weights.");
    let w: [string, [number, number][]][] = [];
    indexBuilder.calculate_weights((term: string, weights: [number, number][]) => {
        w.push([term, weights]);
    });
    console.info("Finished calculating weights.");

    console.info("Started inserting weights to IDB.");
    processedCount = 0;
    for (let [term, weights] of w) {
        await insertWeightsToIndex(term, weights);
        ++processedCount;
        statusProgress?.({
            processTermsPhase: {
                lastProcessedTerm: term,
            },
            processedCount: processedCount,
            totalCount: termCount
        })
    }
    console.info("Finished inserting weights to IDB.");
    console.info("Finished index build.");
}