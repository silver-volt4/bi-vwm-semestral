export function measureTime<T>(func: () => T): {
    (): T,
    time: () => number | null
};
export function measureTime<T>(func: () => Awaited<T>): {
    (): Awaited<T>,
    time: () => number | null
};

export function measureTime(func: any) {
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