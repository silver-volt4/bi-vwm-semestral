import { clearIndex, getDocument, getDocumentList, readTermIndex, writeTermIndex } from "./database.svelte";
import loadWasm, { IndexBuilder, IndexSearcher, initialize } from "./wasm/src_wasm";

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
    let cacheFile = indexBuilder.calculate_weights();

    console.log(cacheFile);
    console.info("Finished calculating weights.");

    console.info("Started inserting weights to IDB.");
    await writeTermIndex(cacheFile);
    console.info("Finished inserting weights to IDB.");

    console.info("Finished index build.");
}

export async function readIndex() {
    let index = await readTermIndex();
    let f = await index.getFile();

    let is = new IndexSearcher();

    let headerLengthBytes = IndexSearcher.get_header_length_size();
    let lengthBytes = await f.slice(0, IndexSearcher.get_header_length_size()).bytes()
    let headerBytes = IndexSearcher.get_header_length(lengthBytes);
    is.load_header(await f.slice(headerLengthBytes, headerLengthBytes + headerBytes).bytes());

    let { start, end } = is.get_slice_for("italy")
    console.log(start, end);
    let r = is.get_index_data_for(await f.slice(start, end).bytes());
    r.forEach(k => {
        console.log(k.get_term(), k.weight);
    })
}