<script lang="ts">
    import { addDocument } from "../database.svelte";
    import { fileSelectDialog } from "../files";
    import { onMount } from "svelte";
    import { type Schema, getDocumentList } from "../database.svelte";
    import IndexRebuilder from "../components/IndexRebuilder.svelte";

    let getListPromise:
        | Promise<Map<Schema.DocumentListPK, Schema.DocumentList>>
        | undefined = $state();

    let {
        selectFile,
    }: {
        selectFile: (id: Schema.DocumentListPK) => any;
    } = $props();

    let dialogRebuildCache = $state(false);

    async function addFiles() {
        let files = await fileSelectDialog();
        await Promise.all(
            files.map(async (file) => {
                let title = file.name;
                let content = await file.text();
                await addDocument(title, content);
            }),
        );
        refresh();
    }

    function rebuildCache() {
        dialogRebuildCache = true;
    }

    function refresh() {
        getListPromise = getDocumentList();
    }

    onMount(() => {
        refresh();
    });
</script>

{#if dialogRebuildCache}
    <IndexRebuilder onclose={() => (dialogRebuildCache = false)} />
{/if}

<div
    class="flex flex-col items-center py-5 px-4 w-full min-h-full bg-yellow-100"
>
    <div class="w-full max-w-300 flex flex-col grow">
        <div class="my-5 text-center">
            <h1 class="text-4xl text-yellow-600 font-bold">
                List of documents
            </h1>
            <button class="btn" onclick={addFiles}>Add files...</button>

            <button class="btn" onclick={rebuildCache}>Index build</button>
        </div>

        <div
            class="grid gap-2"
            style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))"
        >
            {#if getListPromise}
                {#await getListPromise then data}
                    {#each data as row}
                        <button
                            onclick={() => selectFile(row[0])}
                            class="py-2 px-3 bg-yellow-200 text-start cursor-pointer rounded-md shadow-lg"
                        >
                            <div class="text-lg">
                                {row[1].title}
                            </div>
                        </button>
                    {/each}
                {/await}
            {/if}
        </div>
    </div>
</div>
