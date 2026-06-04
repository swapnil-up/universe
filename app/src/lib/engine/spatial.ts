import type { Cell } from './data';

export function wrapCoordinate(value: number, max: number): number {
	return ((value % max) + max) % max;
}

export function cellKey(x: number, y: number): string {
	return `${x},${y}`;
}

export function findInRadius(
	index: Map<string, Cell>,
	x: number, y: number, radius: number,
	width: number, height: number,
	predicate?: (c: Cell) => boolean
): Cell[] {
	const result: Cell[] = [];
	for (let dx = -radius; dx <= radius; dx++) {
		for (let dy = -radius; dy <= radius; dy++) {
			if (dx === 0 && dy === 0) continue;
			const nx = wrapCoordinate(x + dx, width);
			const ny = wrapCoordinate(y + dy, height);
			const cell = index.get(cellKey(nx, ny));
			if (cell && (!predicate || predicate(cell))) {
				result.push(cell);
			}
		}
	}
	return result;
}

export function findEmptyNeighbors(
	index: Map<string, Cell>,
	x: number, y: number,
	width: number, height: number
): Array<{ x: number; y: number }> {
	const neighbors: Array<{ x: number; y: number }> = [];
	for (let dx = -1; dx <= 1; dx++) {
		for (let dy = -1; dy <= 1; dy++) {
			if (dx === 0 && dy === 0) continue;
			const nx = wrapCoordinate(x + dx, width);
			const ny = wrapCoordinate(y + dy, height);
			if (!index.has(cellKey(nx, ny))) {
				neighbors.push({ x: nx, y: ny });
			}
		}
	}
	return neighbors;
}
