<script lang="ts">
    import type { SvelteComponent } from "svelte";
    import AllDocuments from "./components/AllDocuments.svelte";
    import { addDocument } from "./lib/database.svelte";
    import { fileSelectDialog } from "./lib/files";

    let documentListing:
        | undefined
        | SvelteComponent<
              Record<string, never>,
              { refresh: () => Promise<void> }
          > = $state();

    async function addFiles() {
        let files = await fileSelectDialog();
        await Promise.all(
            files.map(async (file) => {
                let title = file.name;
                let content = await file.text();
                await addDocument(title, content);
            }),
        );
        documentListing?.refresh();
    }
</script>

<main class="flex flex-col items-center my-5 px-4">
    <div class="w-full max-w-300 flex flex-col grow">
        <div class="my-5 text-center">
            <h1 class="text-4xl text-yellow-600 font-bold">
                List of documents
            </h1>
            <button onclick={addFiles}>Add files...</button>
        </div>
        <AllDocuments bind:this={documentListing} />
    </div>
</main>
