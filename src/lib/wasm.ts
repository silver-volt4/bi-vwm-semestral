import { clearIndex, getDocument, getDocumentList, insertWeightsToIndex } from "./database.svelte";
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
        lastBuiltDocument: string,
        termCount: number,
    },
    processTermsPhase?: {
        lastProcessedTerm: string,
    },

    processedCount: number,
    totalCount: number
}

async function* batched(i: Iterable<Promise<any>>) {
    let b = [];
    for (let x of i) {
        b.push(x);

        if (b.length === 100) {
            yield Promise.all(b);
        }
        b = [];
    }
    yield Promise.all(b);
}

export async function buildIndex(statusProgress?: (status: IndexBuildStatus) => Promise<void>) {
    console.info("Started index build.");
    let indexBuilder = new IndexBuilder();

    let documents = await getDocumentList();
    let processedCount = 0;
    let termCount = 0;
    console.info("Started adding documents.");
    for (let filename of documents) {
        let content = await getDocument(filename);
        if (!content) {
            continue;
        }

        ++processedCount;
        indexBuilder.add_document(filename, content);
        statusProgress?.({
            importDocumentsPhase: {
                lastBuiltDocument: filename,
                termCount: termCount = indexBuilder.stats(),
            },
            processedCount: processedCount,
            totalCount: documents.length
        })
    }
    console.info("Finished adding documents.");

    await clearIndex();
    console.info("Cleared index table.");

    console.info("Started calculating weights.");
    let w: [string, [string, number][]][] = [];
    indexBuilder.calculate_weights((term: string, weights: [string, number][]) => {
        w.push([term, weights]);
    });
    console.info("Finished calculating weights.");

    console.info("Started inserting weights to IDB.");
    processedCount = 0;

    for await (let batch of batched(w.map(async ([term, weights]) => {
        await insertWeightsToIndex(term, weights);
        ++processedCount;
        await statusProgress?.({
            processTermsPhase: {
                lastProcessedTerm: term,
            },
            processedCount: processedCount,
            totalCount: termCount
        })
    }))) {
        await batch;
    }

    console.info("Finished inserting weights to IDB.");
    console.info("Finished index build.");
}