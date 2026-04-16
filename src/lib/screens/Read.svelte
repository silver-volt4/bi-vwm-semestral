<script lang="ts">
    import { marked } from "marked";
    import { getDocument, getDocumentMeta, type Schema } from "../documents";
    import { scale } from "svelte/transition";
    import { recommendSimilar } from "../wasm";
    import { mdiArrowLeft as Back } from "@mdi/js";
    import SvgIcon from "@jamescoyle/svelte-icon";
    import type { Weighting } from "../wasm/src_wasm";
    import { measureTime } from "../utils";
    import { untrack } from "svelte";

    let {
        fileId,
        close,
        selectFile,
    }: {
        fileId: Schema.DocumentListPK;
        close: () => any;
        selectFile: (id: Schema.DocumentListPK) => any;
    } = $props();

    type SimilarDocument = {
        document: Schema.DocumentList;
        weight: number;
    };

    let timeTook: number = $state(0);
    let slowTimeTook: number | null = $state(null);

    async function getBestSimilarDocuments() {
        untrack(() => {
            slowTimeTook = null;
        });
        let timed = measureTime(async () => {
            let best = await recommendSimilar(fileId);
            let map = new Map<Schema.DocumentListPK, SimilarDocument>();
            await Promise.all(
                best.map(async (k: Weighting) =>
                    map.set(k.document, {
                        document: await getDocumentMeta(k.document),
                        weight: k.weight,
                    }),
                ),
            );
            return map;
        });

        let result = await timed();
        timeTook = timed.time()!;
        return result;
    }

    let document = $derived(
        Promise.all([getDocumentMeta(fileId), getDocument(fileId)]),
    );
    let recommendationsLoader = $derived(getBestSimilarDocuments());
</script>

{#snippet errorDisplay(what: string)}
    {what}
{/snippet}

<div class="flex flex-col items-center w-screen min-h-screen bg-neutral-100">
    {#await document}
        <div class="self-center py-5">Loading...</div>
    {:then [documentMeta, documentContent]}
        <div
            class="p-2 w-full bg-neutral-200 sticky top-0 text-2xl font-bold flex gap-4 items-center shadow-xl"
        >
            <button class="btn-icon" onclick={() => close()}>
                <SvgIcon type="mdi" path={Back} size="28" />
            </button>
            {documentMeta.title}
        </div>
        <div class="px-4 w-full max-w-300 flex flex-col grow md-content">
            {@html marked.parse(documentContent.content)}

            {#await recommendationsLoader then recommendations}
                <div
                    in:scale
                    class="bg-neutral-200 p-4 rounded-md flex flex-col gap-2 sticky bottom-4 shadow-md contour"
                >
                    <div class="font-bold text-2xl">Recommended articles</div>
                    <div class="flex flex-wrap gap-2">
                        {#each recommendations.entries() as [id, rec]}
                            <button
                                class="btn btn-dark p-0 min-w-20"
                                onclick={() => selectFile(id)}
                            >
                                <div class="px-3 py-1">
                                    {rec.document.title}
                                </div>
                                <div
                                    class="text-xs py-1 bg-neutral-950/50 rounded-b-lg"
                                    title="Cosine Similarity"
                                >
                                    {rec.weight.toFixed(4)}
                                </div>
                            </button>
                        {/each}
                    </div>
                    <div>
                        Search took {timeTook}s
                        {#if slowTimeTook === null}
                            <button
                                class="btn btn-dark"
                                onclick={async () => {
                                    let timed = measureTime(async () => {
                                        console.log("slow similar")
                                        await recommendSimilar(fileId, true);
                                        console.log("slow similar end")
                                    });
                                    await timed();
                                    slowTimeTook = timed.time()!;
                                }}
                            >
                                Benchmark slow traversal...
                            </button>
                        {:else}
                            Slow search took {slowTimeTook}s
                        {/if}
                    </div>
                </div>
            {/await}
        </div>
    {:catch e}
        {@render errorDisplay(String(e).toString())}
    {/await}
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
