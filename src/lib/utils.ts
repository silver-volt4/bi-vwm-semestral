export function measureTime<T>(func: () => T): {
    (): T,
    time: () => number | null
};
export function measureTime<T>(func: () => Awaited<T>): {
    (): Awaited<T>,
    time: () => number | null
};

/**
 * Utility function that wraps a function with time measurement capabilities.
 * The passed function may return a promise (therefore, it may be async).
 * The returned function has the `time` property which returns, in seconds, for how long the function ran. 
 */
export function measureTime(func: CallableFunction) {
    let timeTook: number | null = null;
    let exec: {
        (): any;
        time: () => number | null;
    } = undefined!;

    // @ts-expect-error
    exec = () => {
        let start = +new Date();
        let retval = func();
        if (retval instanceof Promise) {
            return retval.then(retval => {
                timeTook = (+new Date() - start) / 1000;
                return Promise.resolve(retval);
            })
        } else {
            timeTook = (+new Date() - start) / 1000;
            return retval;
        }
    }

    exec["time"] = () => {
        return timeTook;
    }

    return exec;
}