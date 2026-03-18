<script lang="ts">
    import { tick } from "svelte";
    import { buildIndex, type IndexBuildStatus } from "../wasm";

    let inProgress = $state(false);
    let status: IndexBuildStatus | null = $state(null);

    let { onclose }: { onclose: () => void } = $props();

    async function startProcess() {
        inProgress = true;
        let cb = async (newStatus: IndexBuildStatus) => {
            status = newStatus;
            await tick();
        };
        await buildIndex(cb);
        onclose();
    }
</script>

<div
    class="bg-black/50 fixed top-0 left-0 w-full h-full overflow-auto text-white p-3"
>
    {#if !inProgress}
        Perform index rebuild?<br />
        It may take a while.

        <button class="btn" onclick={startProcess}>Yes</button>
        <button class="btn" onclick={() => onclose()}>No</button>
    {:else if status?.importDocumentsPhase}
        <div>
            <b>Processed document</b>: {status.importDocumentsPhase
                .lastBuiltDocument.title}
        </div>
        <div>
            <b>Total term count</b>: {status.importDocumentsPhase.termCount}
        </div>
        <div>
            <b>Progress</b>: {status.processedCount} / {status.totalCount}
        </div>
    {:else if status?.processTermsPhase}
        <div>
            <b>Processed term</b>: {status.processTermsPhase.lastProcessedTerm}
        </div>
        <div>
            <b>Progress</b>: {status.processedCount} / {status.totalCount}
        </div>
    {/if}
</div>
