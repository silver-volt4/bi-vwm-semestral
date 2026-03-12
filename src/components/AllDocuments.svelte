<script lang="ts">
    import { onMount } from "svelte";
    import DB, {
        type Schema,
        addDocument,
        getDocumentList,
    } from "../lib/database.svelte";

    let getListPromise: Promise<Schema.DocumentList[]> | undefined = $state();

    export async function refresh() {
        getListPromise = getDocumentList();
    }

    onMount(() => {
        refresh();
    });
</script>

<div class="flex flex-col gap-2">
    {#if getListPromise}
        {#await getListPromise then data}
            {#each data as row}
                <button class="py-2 px-3 bg-yellow-200 text-start cursor-pointer rounded-md shadow-lg">
                    <div class="text-lg">
                        {row.title}
                    </div>
                </button>
            {/each}
        {/await}
    {/if}
</div>
