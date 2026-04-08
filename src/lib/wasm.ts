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

    console.info("Started building cache files.");
    await writeFile("termToDocumentIndex", indexBuilder.create_term_to_document_weight_index_file());
    await writeFile("documentToTermIndex", indexBuilder.create_document_to_term_list());
    console.info("Finished building cache files.");

    console.info("Finished index build.");
}

export async function recommendSimilar(document: Schema.DocumentListPK) {
    let documentToTermIndex = await readFile("documentToTermIndex");
    let termToDocumentIndex = await readFile("termToDocumentIndex");

    let documentToTermIndexSearcher = new DocumentToTermListIndexSearcher();
    let termToDocumentIndexSearcher = new TermToDocumentWeightIndexSearcher();

    let headerLengthBytes = DocumentToTermListIndexSearcher.get_header_length_size();
    let lengthBytes = await documentToTermIndex.slice(0, headerLengthBytes).bytes()
    let headerBytes = DocumentToTermListIndexSearcher.get_header_length(lengthBytes);
    documentToTermIndexSearcher.load_header(await documentToTermIndex.slice(headerLengthBytes, headerLengthBytes + headerBytes).bytes());

    headerLengthBytes = TermToDocumentWeightIndexSearcher.get_header_length_size();
    lengthBytes = await termToDocumentIndex.slice(0, headerLengthBytes).bytes()
    headerBytes = TermToDocumentWeightIndexSearcher.get_header_length(lengthBytes);
    termToDocumentIndexSearcher.load_header(await termToDocumentIndex.slice(headerLengthBytes, headerLengthBytes + headerBytes).bytes());

    let { start, end } = documentToTermIndexSearcher.get_slice_for(document)
    let terms = documentToTermIndexSearcher.get_index_data_for(await documentToTermIndex.slice(start, end).bytes())

    for (let term of terms) {
        let { start, end } = termToDocumentIndexSearcher.get_slice_for(term);
        termToDocumentIndexSearcher.get_weighting_data(term, await termToDocumentIndex.slice(start, end).bytes());
    }

    return termToDocumentIndexSearcher.recommend_similar(document, 5);
}