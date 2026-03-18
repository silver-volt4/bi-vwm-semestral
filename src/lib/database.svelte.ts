import { openDB, type DBSchema } from "idb";

export namespace Schema {
    export type DocumentListPK = DB['documentList']['key'];

    export interface DocumentList {
        title: string,
    }

    export interface DocumentContent {
        key: number,
        content: string,
    }

    export interface SearchIndex {
        term: string,
        document: DocumentListPK,
        weight: number,
    }

    export interface DB extends DBSchema {
        'documentList': {
            key: number;
            value: DocumentList;
        };
        'documentContent': {
            key: DocumentListPK;
            value: DocumentContent;
        };
        'searchIndex': {
            key: number,
            value: SearchIndex,
            indexes: { 'indexTerm': string, 'indexDocument': DocumentListPK }
        }
    }
}

const DB = await openDB<Schema.DB>('appdata', 7, {
    async upgrade(db, oldVersion, newVersion, tx) {
        console.info("Upgrading DB");

        if (!db.objectStoreNames.contains('documentList')) {
            db.createObjectStore('documentList', { autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('documentContent')) {
            db.createObjectStore('documentContent', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('searchIndex')) {
            let os = db.createObjectStore('searchIndex', { autoIncrement: true });
            os.createIndex("indexTerm", "term");
            os.createIndex("indexDocument", "document");
        }
    }
});

export default DB;

export async function addDocument(title: string, content: string) {
    let tx = DB.transaction(["documentList", "documentContent"], "readwrite");
    const documentList = tx.objectStore("documentList");
    const documentContent = tx.objectStore("documentContent");
    let id = await documentList.add({ title: title });
    await documentContent.add({ key: id, content: content })
    await tx.done;
}

export async function getDocumentList() {
    let tx = DB.transaction("documentList");
    let c = await tx.objectStore("documentList").openCursor();
    let result = new Map<Schema.DocumentListPK, Schema.DocumentList>();
    while (c) {
        result.set(c.key, c.value);
        c = await c.continue();
    }
    return result;
}

export async function getDocumentMeta(key: Schema.DocumentListPK) {
    let doc = await DB.get("documentList", key) ?? null;
    if (!doc) throw new Error();
    return doc;
}

export async function getDocument(key: Schema.DocumentListPK) {
    return await DB.get("documentContent", key) ?? null;
}

export async function clearIndex() {
    await DB.clear('searchIndex');
}

export async function insertWeightsToIndex(term: string, weights: [number, number][]) {
    let tx = DB.transaction("searchIndex", "readwrite");
    for (let [documentId, weight] of weights) {
        let os = tx.objectStore("searchIndex");
        os.add({ term: term, document: documentId, weight: weight });
    }
    await tx.done;
}

export async function getWeightsOfDocument(document: Schema.DocumentListPK) {
    return await DB.getAllFromIndex('searchIndex', 'indexDocument', document)
}

export async function getWeightsOfTerm(term: string) {
    return await DB.getAllFromIndex('searchIndex', 'indexTerm', term);
}

export async function searchInIndex(termsAndWeights: { [key: string]: Schema.SearchIndex }) {
    let terms: {
        [key: string]: {
            position: number,
            data: Schema.SearchIndex[]
        }
    } = {};
    let documentId = 0;
    for await (let key of Object.keys(termsAndWeights)) {
        let data = await getWeightsOfTerm(key);
        let firstDocument = data[0]?.document;
        if (firstDocument) {
            if (documentId === 0) {
                documentId = firstDocument;
            } else {
                documentId = Math.min(documentId, firstDocument);
            }
        }
        terms[key] = {
            position: 0,
            data: data,
        }
    }

    let done = false;

    let topFive: [number, number][] = [];

    let todo = Object.keys(terms).length;

    while (todo > 0) {
        console.log(todo);
        console.log("Iterating document ID ", documentId);
        let cosSimUp = 0;
        let cosSimLeft = 0;
        let cosSimRight = 0;

        done = true;
        for (let key in terms) {
            let d = terms[key];

            if (d.position >= d.data.length) continue;
            let indexData = d.data[d.position];

            if (indexData.document === documentId) {
                d.position++;
                cosSimUp += indexData.weight * termsAndWeights[key].weight;
                cosSimLeft += Math.pow(indexData.weight, 2);
                cosSimRight += Math.pow(termsAndWeights[key].weight, 2);
                if (d.position >= d.data.length) {
                    todo--;
                }
            }
        }

        let cosSim = cosSimUp / Math.sqrt(cosSimLeft * cosSimRight);

        console.log("document ", documentId, " has similarity ", cosSim);

        if (topFive.length < 5) {
            topFive.push([documentId, cosSim]);
        } else {
            let lowest = -1;
            let lowestSimilarity = -1;
            let i = 0;
            for (let [documentId, similarity] of topFive) {
                if (lowestSimilarity == -1 || lowestSimilarity > similarity) {
                    lowestSimilarity = similarity;
                    lowest = i;
                }
                i++;
            }
            if (lowestSimilarity < cosSim) {
                topFive.splice(lowest, 1, [documentId, cosSim]);
            }
        }

        documentId++;
    }

    return topFive;
}