import { SvelteMap as Map } from "svelte/reactivity";
const allNotifications = new Map<Symbol, Notification>();
export default allNotifications;

class Notification {
    title: string = $state("")
    text: string = $state("")
    progress: number | null = $state(null);

    constructor(title: string, text: string) {
        this.title = title;
        this.text = text;
    }
}

export function toast(title: string, text: string, ms: number) {
    let id = Symbol();
    let notification = new Notification(title, text);
    allNotifications.set(id, notification);
    setTimeout(() => {
        allNotifications.delete(id);
    }, ms);
}

export function progress(title: string, text: string, progress: number) {
    let id = Symbol();
    let notification = new Notification(title, text);
    notification.progress = progress;
    allNotifications.set(id, notification);
    return {
        update: (title: string | null, text: string | null, progress: number | null) => {
            title ??= notification.title
            text ??= notification.text
            progress ??= notification.progress
            notification.title = title;
            notification.text = text;
            notification.progress = progress;
        },
        done: (hideAfterMs: number | null) => {
            if (hideAfterMs !== null) {
                setTimeout(() => {
                    allNotifications.delete(id);
                }, hideAfterMs)
            } else {
                allNotifications.delete(id);
            }
        }
    }
}

export type { Notification };