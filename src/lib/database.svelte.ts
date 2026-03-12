import { openDB, type DBSchema } from "idb";

export namespace Schema {
    export interface DocumentList {
        title: string,
    }

    export interface DocumentContent {
        key: number,
        content: string,
    }

    export interface DB extends DBSchema {
        'documentList': {
            key: number;
            value: DocumentList;
        };
        'documentContent': {
            key: number;
            value: DocumentContent;
        };
    }
}


const DB = await openDB<Schema.DB>('appdata', 1, {
    upgrade(db) {
        if (!db.objectStoreNames.contains('documentList')) {
            db.createObjectStore('documentList', { autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('documentContent')) {
            db.createObjectStore('documentContent', { keyPath: 'key' });
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

console.log(addDocument);

export async function getDocumentList() {
    return await DB.getAll("documentList");
}