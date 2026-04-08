<script lang="ts">
    import { marked } from "marked";
    import { getDocument, getDocumentMeta, type Schema } from "../documents";
    import { scale } from "svelte/transition";
    import { recommendSimilar } from "../wasm";

    let {
        fileId,
        selectFile,
    }: {
        fileId: Schema.DocumentListPK;
        selectFile: (id: Schema.DocumentListPK) => any;
    } = $props();

    type SimilarDocument = {
        document: Schema.DocumentList;
        weight: number;
    };

    async function getBestSimilarDocuments() {
        let best = await recommendSimilar(fileId);
        let map = new Map<Schema.DocumentListPK, SimilarDocument>();
        await Promise.all(
            best.map(async (k) =>
                map.set(k.document, {
                    document: await getDocumentMeta(k.document),
                    weight: k.weight,
                }),
            ),
        );
        return map;
    }

    let documentContent = $derived(getDocument(fileId));
    let recommendationsLoader = $derived(getBestSimilarDocuments());
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
                {@html marked.parse(file?.content)}
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
                            {rec.document.title}
                            ({rec.weight.toFixed(4)})
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
