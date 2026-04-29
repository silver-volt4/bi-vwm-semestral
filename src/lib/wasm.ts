import { progress } from "./components/notifications.svelte";
import { clearIndex, getDocument, getDocumentList, type Schema } from "./documents";
import { readFile } from "./files";
import { writeFile } from "./files";
import loadWasm, { IndexBuilder, TermToDocumentWeightIndexSearcher, DocumentToTermListIndexSearcher, initialize } from "./wasm/src_wasm";

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

function estimateTimeRemaining(
    start: Date,
    processed: number,
    total: number,
) {
    let now = new Date();
    let diff = +now - +start;

    let remaining = (diff / processed) * (total - processed);

    let seconds = Math.floor(remaining / 1000) + 1;
    let minutes = Math.floor(seconds / 60);
    seconds %= 60;

    return `${minutes}m ${seconds}s`;
}

export async function buildIndex() {
    let notification = progress("", "", 0);
    let started: Date = new Date();

    let indexBuilder = new IndexBuilder();

    notification.update("Enumerating documents...", "", 0);
    let documents = await getDocumentList();

    notification.update("Scanning terms...", "", 0);

    let processedCount = 0;

    for (let [key, documentFromList] of documents) {
        let document = await getDocument(key);
        if (!document) {
            continue;
        }

        ++processedCount;
        indexBuilder.add_document(key, document.content);

        notification.update(
            "Scanning terms...",
            `Last processed document: ${documentFromList.title}\n` +
            `Total processed terms: ${indexBuilder.stats()}\n` +
            `ETA: ${estimateTimeRemaining(started, processedCount, documents.size)}`,
            processedCount / documents.size
        );
    }

    notification.update("Building optimized cache files...", "", 0);
    await clearIndex();
    await writeFile("termToDocumentIndex", indexBuilder.create_term_to_document_weight_index_file());
    await writeFile("documentToTermIndex", indexBuilder.create_document_to_term_list());

    let ended = new Date();
    notification.update("Completed!", `Took ${(+ended - +started)/1000} seconds.\nFound ${indexBuilder.stats()} terms.`, 0);
    notification.done(5000);
}

export async function recommendSimilar(document: Schema.DocumentListPK, slowMode: boolean = false) {
    let documentToTermIndex = await readFile("documentToTermIndex");
    let termToDocumentIndex = await readFile("termToDocumentIndex");

    let terms: string[] = [];


    let termToDocumentIndexSearcher = new TermToDocumentWeightIndexSearcher();
    let headerLengthBytes = TermToDocumentWeightIndexSearcher.get_header_length_size();
    let lengthBytes = await termToDocumentIndex.slice(0, headerLengthBytes).bytes()
    let headerBytes = TermToDocumentWeightIndexSearcher.get_header_length(lengthBytes);
    termToDocumentIndexSearcher.load_header(await termToDocumentIndex.slice(headerLengthBytes, headerLengthBytes + headerBytes).bytes());

    if (!slowMode) {
        let documentToTermIndexSearcher = new DocumentToTermListIndexSearcher();
        let headerLengthBytes = DocumentToTermListIndexSearcher.get_header_length_size();
        let lengthBytes = await documentToTermIndex.slice(0, headerLengthBytes).bytes()
        let headerBytes = DocumentToTermListIndexSearcher.get_header_length(lengthBytes);
        documentToTermIndexSearcher.load_header(await documentToTermIndex.slice(headerLengthBytes, headerLengthBytes + headerBytes).bytes());

        let { start, end } = documentToTermIndexSearcher.get_slice_for(document)
        terms = documentToTermIndexSearcher.get_index_data_for(await documentToTermIndex.slice(start, end).bytes())
    } else {
        terms = termToDocumentIndexSearcher.get_all_terms();
    }

    for (let term of terms) {
        let { start, end } = termToDocumentIndexSearcher.get_slice_for(term);
        termToDocumentIndexSearcher.get_weighting_data(term, await termToDocumentIndex.slice(start, end).bytes());
    }

    return termToDocumentIndexSearcher.recommend_similar(document, 5);
}