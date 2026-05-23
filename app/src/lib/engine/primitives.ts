export function wrapCoordinate(value: number, max: number): number {
	return ((value % max) + max) % max;
}

export function pipe<T>(...fns: Array<(arg: T) => T>): (arg: T) => T {
	return (arg: T) => fns.reduce((acc, fn) => fn(acc), arg);
}

export function times<T>(count: number, fn: (index: number) => T): T[] {
	return Array.from({ length: count }, (_, i) => fn(i));
}
