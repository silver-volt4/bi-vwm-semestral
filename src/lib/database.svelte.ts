import { openDB, type DBSchema } from "idb";

async function getFilesystemHandle() {
    let fs;
    try {
        fs = await navigator.storage.getDirectory();
    } catch (e) {
        alert("This browser does not support 'Origin private file system' technology required for this project to function");
        throw e;
    }

    return fs;
}

const FS = await getFilesystemHandle();
const DIR_DOCUMENTS = await FS.getDirectoryHandle("documents", { create: true });
const DIR_TERMS = await FS.getDirectoryHandle("terms", { create: true });

console.log(FS);
console.log(DIR_DOCUMENTS);

export async function addDocument(title: string, content: string) {
    let file = await DIR_DOCUMENTS.getFileHandle(title, { create: true });
    let wr = await file.createWritable();
    await wr.write(content);
    await wr.close();
}

export async function getDocumentList() {
    let documents = await FS.getDirectoryHandle("documents");
    let filenames = [];
    for await (const [filename, handle] of documents.entries()) {
        if (handle.kind !== "file") continue;
        filenames.push(filename);
    }
    return filenames;
}

export async function getDocumentMeta(filename: string) {
    throw new Error("Deprecated")
}

export async function getDocument(filename: string) {
    let documents = await FS.getDirectoryHandle("documents");
    let fileHandle = await documents.getFileHandle(filename);
    let file = await fileHandle.getFile();
    let text = await file.text();
    return text;
}

export async function clearIndex() {
    // await DB.clear('searchIndex');
}

export async function writeTermIndex(data: Uint8Array) {
    let termHandle = await FS.getFileHandle("termIndex", { create: true });
    let wr = await termHandle.createWritable({ keepExistingData: false });
    await wr.write(JSON.stringify(data));
    await wr.close();
}

export async function getWeightsOfDocument(document: string) {
    return await DB.getAllFromIndex('searchIndex', 'indexDocument', document)
}

export async function getWeightsOfTerm(term: string) {
    return await DB.getAllFromIndex('searchIndex', 'indexTerm', term);
}

export async function searchInIndex(termsAndWeights: { [key: string]: Schema.SearchIndex }, exclude: string[] = [], nResults: number = 5) {
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

    let bestN: [number, number][] = [];

    let nextDocumentId = 0;

    while (nextDocumentId != -1) {
        nextDocumentId = -1;

        let cosSimUp = 0;
        let cosSimLeft = 0;
        let cosSimRight = 0;

        for (let key in terms) {
            let d = terms[key];

            cosSimRight += Math.pow(termsAndWeights[key].weight, 2);

            if (d.position >= d.data.length) continue;
            let indexData = d.data[d.position];

            if (indexData.document === documentId) {
                d.position++;
                cosSimUp += indexData.weight * termsAndWeights[key].weight;
                cosSimLeft += Math.pow(indexData.weight, 2);
            }

            if (d.position < d.data.length && (nextDocumentId === -1 || d.data[d.position].document < nextDocumentId)) {
                nextDocumentId = d.data[d.position].document;
            }
        }

        if (!exclude.includes(documentId)) {
            let cosSim = cosSimUp / Math.sqrt(cosSimLeft * cosSimRight);

            if (bestN.length < nResults) {
                bestN.push([documentId, cosSim]);
            } else {
                let lowest = -1;
                let lowestSimilarity = -1;
                let i = 0;
                for (let [documentId, similarity] of bestN) {
                    if (lowestSimilarity == -1 || lowestSimilarity > similarity) {
                        lowestSimilarity = similarity;
                        lowest = i;
                    }
                    i++;
                }
                if (lowestSimilarity < cosSim) {
                    bestN.splice(lowest, 1, [documentId, cosSim]);
                }
            }
        }

        documentId = nextDocumentId;

    }

    bestN.sort((a, b) => a[1] - b[1]);
    return bestN.map(k => k[0]);
}