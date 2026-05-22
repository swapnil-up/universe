export type Rng = () => number;

export function createRng(seed: number): Rng {
	let s = seed | 0;
	return function () {
		s = (s * 1103515245 + 12345) & 0x7fffffff;
		return s / 0x80000000;
	};
}

export function randomInt(rng: Rng, max: number): number {
	return Math.floor(rng() * max);
}

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

export function randomDirection(rng: Rng): Dir {
	return DIRECTIONS[randomInt(rng, DIRECTIONS.length)];
}
