export function fileSelectDialog(): Promise<File[]> {
    let fileInput = document.createElement("input")
    fileInput.type = "file";
    fileInput.multiple = true;

    return new Promise(resolve => {
        const success = (e: Event) => {
            fileInput.removeEventListener("cancel", failure);
            resolve(Array.from((e.target as HTMLInputElement | null)?.files ?? []));
        };
        const failure = (e: Event) => {
            fileInput.removeEventListener("change", success);
            resolve([]);
        }
        fileInput.addEventListener("change", success, { once: true })
        fileInput.addEventListener("cancel", failure, { once: true })
        fileInput.click();
    });
}

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

export async function writeFile(filename: string, data: Uint8Array) {
    let termHandle = await FS.getFileHandle(filename, { create: true });
    let wr = await termHandle.createWritable({ keepExistingData: false });
    await wr.write(new Blob([data as any]));
    await wr.close();
}

export async function readFile(filename: string) {
    let termHandle = await FS.getFileHandle(filename);
    return await termHandle.getFile();
}