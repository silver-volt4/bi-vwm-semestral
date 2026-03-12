<script lang="ts">
    import { marked } from "marked";
    import { getDocument, type Schema } from "../database.svelte";

    let {
        fileId,
    }: {
        fileId: Schema.DocumentListPK;
    } = $props();

    let fileReader = $derived(getDocument(fileId));
</script>

{#snippet errorDisplay(what: string)}
    {what}
{/snippet}

<div
    class="flex flex-col items-center py-5 px-4 w-screen min-h-screen bg-neutral-100"
>
    <div class="w-full max-w-300 flex flex-col grow md-content">
        {#await fileReader then file}
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
