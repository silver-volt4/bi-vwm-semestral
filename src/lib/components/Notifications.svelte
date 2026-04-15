<script lang="ts">
    import allNotifications, {
        type Notification,
    } from "./notifications.svelte";
    import { slide } from "svelte/transition";
</script>

{#snippet notificationBlock(notification: Notification)}
    <div transition:slide>
        <div class="btn bg-white">
            <div class="font-bold">
                {$state.eager(notification.title)}
            </div>
            <div class="whitespace-pre-wrap">
                {$state.eager(notification.text)}
            </div>
        </div>
    </div>
{/snippet}

<div
    class="fixed right-4 top-4 pointer-events-none z-50 flex flex-col gap-2 w-100"
>
    {#each allNotifications.values() as value}
        {@render notificationBlock(value)}
    {/each}
</div>
