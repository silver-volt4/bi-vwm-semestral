<script lang="ts">
    import { marked } from "marked";
    import {
        getDocument,
        getDocumentMeta,
        getWeightsOfDocument,
        searchInIndex,
        type Schema,
    } from "../database.svelte";

    let {
        fileId,
    }: {
        fileId: Schema.DocumentListPK;
    } = $props();

    async function getBestSimilarDocuments(
        id: number,
    ): Promise<[Schema.DocumentList, number][]> {
        let weights = (await getWeightsOfDocument(id)).reduce(
            (previous, current) => {
                previous[current.term] = current;
                return previous;
            },
            {},
        );
        let best = await searchInIndex(weights);
        return await Promise.all(
            best.map(async (b) => [await getDocumentMeta(b[0]), b[1]]),
        );
    }

    let fileReader = $derived(
        Promise.all([getDocument(fileId), getBestSimilarDocuments(fileId)]),
    );

    let showWeights = $state(false);
</script>

{#snippet errorDisplay(what: string)}
    {what}
{/snippet}

<div
    class="flex flex-col items-center py-5 px-4 w-screen min-h-screen bg-neutral-100"
>
    <div class="w-full max-w-300 flex flex-col grow md-content">
        {#await fileReader then [file, recommendations]}
            {#if file}
                <div>
                    <div>READ MORE:</div>
                    {#each recommendations as rec}
                        <div>{rec[0].title} (similarity {rec[1]})</div>
                    {/each}
                </div>
                {@html marked.parse(file?.content)}
            {:else}
                {@render errorDisplay(
                    "Invalid document ID (does the file exist?)",
                )}
            {/if}
        {:catch e}
            {@render errorDisplay(String(e).toString())}
        {/await}
    </div>
</div>

<style>
    @reference "../../main.css";

    .md-content :global(h1) {
        @apply text-3xl font-bold my-4;
    }
    .md-content :global(h2) {
        @apply text-2xl font-bold my-3;
    }
    .md-content :global(h3) {
        @apply text-xl font-bold my-2;
    }
    .md-content :global(h4) {
        @apply text-lg font-bold my-1;
    }
</style>
