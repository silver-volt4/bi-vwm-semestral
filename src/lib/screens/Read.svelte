<script lang="ts">
    import { marked } from "marked";
    import {
        getDocument,
        getDocumentMeta,
        getWeightsOfDocument,
        searchInIndex,
    } from "../database.svelte";
    import { scale } from "svelte/transition";

    let {
        fileId,
        selectFile,
    }: {
        fileId: string;
        selectFile: (id: string) => any;
    } = $props();

    async function getBestSimilarDocuments(id: number) {
        let weights = (await getWeightsOfDocument(id)).reduce(
            (previous, current) => {
                // @ts-ignore
                previous[current.term] = current;
                return previous;
            },
            {},
        );
        let best = await searchInIndex(weights, [id]);
        let result = new Map<number, Schema.DocumentList>();
        for (let id of best) {
            result.set(id, await getDocumentMeta(id));
        }

        return result;
    }
    
    let documentContent = $derived(getDocument(fileId));
    let recommendationsLoader = $derived(getBestSimilarDocuments(fileId));
</script>

{#snippet errorDisplay(what: string)}
    {what}
{/snippet}

<div
    class="flex flex-col items-center py-5 px-4 w-screen min-h-screen bg-neutral-100"
>
    <div class="w-full max-w-300 flex flex-col grow md-content">
        {#await documentContent}
            <div class="self-center">Loading...</div>
        {:then file}
            {#if file}
                {@html marked.parse(file)}
            {:else}
                {@render errorDisplay(
                    "Invalid document ID (does the file exist?)",
                )}
            {/if}
        {:catch e}
            {@render errorDisplay(String(e).toString())}
        {/await}
        {#await recommendationsLoader then recommendations}
            <div
                in:scale
                class="bg-neutral-200 p-4 rounded-md flex flex-col gap-2 sticky bottom-4"
            >
                <div class="font-bold text-2xl">
                    Don't miss out on these articles!
                </div>
                <div class="flex flex-wrap gap-2">
                    {#each recommendations as [id, rec]}
                        <button
                            class="p-2 bg-neutral-800 text-white rounded-md"
                            onclick={() => selectFile(id)}
                        >
                            {rec.title}
                        </button>
                    {/each}
                </div>
            </div>
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
