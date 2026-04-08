<script lang="ts">
    import FileListing from "./lib/screens/FileListing.svelte";
    import Read from "./lib/screens/Read.svelte";

    let selectedFilename: string | null = $state(null);
</script>

<div class="overflow-y-auto w-screen h-screen">
    {#if selectedFilename === null}
        <FileListing
            selectFile={(fileId) => {
                selectedFilename = fileId;
            }}
        />
    {:else}
        <Read
            fileId={selectedFilename}
            selectFile={(fileId) => {
                selectedFilename = fileId;
            }}
        ></Read>
    {/if}
</div>
