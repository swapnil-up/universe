export interface Dir {
	readonly x: number;
	readonly y: number;
}

export const DIRECTIONS: readonly Dir[] = [
	{ x: -1, y: 0 },
	{ x: 1, y: 0 },
	{ x: 0, y: -1 },
	{ x: 0, y: 1 }
];

export function nextRandom(state: number): [number, number] {
	const s = (state * 1103515245 + 12345) & 0x7fffffff;
	return [s / 0x80000000, s];
}

export function randomDir(rand: number): Dir {
	return DIRECTIONS[Math.floor(rand * DIRECTIONS.length)];
}
