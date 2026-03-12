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