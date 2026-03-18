<script lang="ts">
    import { type Schema } from "./lib/database.svelte";
    import FileListing from "./lib/screens/FileListing.svelte";
    import Read from "./lib/screens/Read.svelte";

    let selectedFileId: Schema.DocumentListPK | null = $state(null);
</script>

<div class="overflow-y-auto w-screen h-screen">
    {#if selectedFileId === null}
        <FileListing
            selectFile={(fileId) => {
                selectedFileId = fileId;
            }}
        />
    {:else}
        <Read
            fileId={selectedFileId}
            selectFile={(fileId) => {
                selectedFileId = fileId;
            }}
        ></Read>
    {/if}
</div>
