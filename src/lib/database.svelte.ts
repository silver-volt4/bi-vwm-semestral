import { openDB, type DBSchema } from "idb";

export namespace Schema {
    export type DocumentListPK = DB['documentList']['key'];

    export interface DocumentList {
        title: string,
    }

    export interface DocumentContent {
        key: number,
        content: string,
        tokens: string[]
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
    }
});

export default DB;

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


export async function addDocument(title: string, content: string) {
    let tx = DB.transaction(["documentList", "documentContent"], "readwrite");
    const documentList = tx.objectStore("documentList");
    const documentContent = tx.objectStore("documentContent");
    let id = await documentList.add({ title: title });
    await documentContent.add({ key: id, content: content, tokens: [] })
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
    let d = await DB.get("documentList", key) ?? null;
    if (!d) throw new Error();
    return d;
}

export async function getDocument(key: Schema.DocumentListPK) {
    let d = await DB.get("documentContent", key) ?? null;
    if (!d) throw new Error();
    return d;
}

export async function clearIndex() {
    // await DB.clear('searchIndex');
}

export async function writeTermIndex(data: Uint8Array) {
    let termHandle = await FS.getFileHandle("termIndex", { create: true });
    let wr = await termHandle.createWritable({ keepExistingData: false });
    await wr.write(new Blob([data as any]));
    await wr.close();
}

export async function readTermIndex() {
    let termHandle = await FS.getFileHandle("termIndex");
    return termHandle;
}