import type { Cell, World } from './data';

export function wrapCoordinate(value: number, max: number): number {
	return ((value % max) + max) % max;
}

export function getNeighbors(x: number, y: number, width: number, height: number): Array<{ x: number; y: number }> {
	const directions = [
		{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
		{ x: -1, y: 0 },                   { x: 1, y: 0 },
		{ x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 }
	];

	return directions.map(d => ({
		x: wrapCoordinate(x + d.x, width),
		y: wrapCoordinate(y + d.y, height)
	}));
}

export function getNeighborsInRadius(
	x: number, y: number, radius: number, width: number, height: number
): Array<{ x: number; y: number }> {
	const positions: Array<{ x: number; y: number }> = [];
	for (let dx = -radius; dx <= radius; dx++) {
		for (let dy = -radius; dy <= radius; dy++) {
			if (dx === 0 && dy === 0) continue;
			positions.push({
				x: wrapCoordinate(x + dx, width),
				y: wrapCoordinate(y + dy, height)
			});
		}
	}
	return positions;
}

export function findCellAt(cells: readonly Cell[], x: number, y: number): Cell | undefined {
	return cells.find(c => c.x === x && c.y === y);
}

export function findEmptyNeighbors(
	cells: readonly Cell[],
	x: number, y: number,
	width: number, height: number
): Array<{ x: number; y: number }> {
	const neighbors = getNeighbors(x, y, width, height);
	return neighbors.filter(n => !findCellAt(cells, n.x, n.y));
}

export function applyEntropy(cell: Cell, settings: World['settings']): Cell {
	const baseRate = cell.type === 'SEEKER' ? settings.entropyRateSeeker : settings.entropyRatePlant;
	const decay = Math.max(1, Math.floor(cell.energy * (baseRate / 100)));
	return { ...cell, energy: Math.max(0, cell.energy - decay) };
}

export function applyMoveCost(cell: Cell, moved: boolean, settings: World['settings']): Cell {
	if (!moved) return cell;
	return { ...cell, energy: Math.max(0, cell.energy - settings.moveCost) };
}

export function checkFeeding(
	seeker: Cell,
	cells: readonly Cell[],
	settings: World['settings'],
	width: number, height: number
): { newSeeker: Cell; plantId: number } | null {
	const nearby = getNeighborsInRadius(seeker.x, seeker.y, settings.searchRadius, width, height);
	const plant = cells.find(c => c.type === 'PLANT' && nearby.some(n => n.x === c.x && n.y === c.y));
	if (!plant) return null;

	return {
		newSeeker: { ...seeker, energy: Math.min(100, seeker.energy + settings.eatGain) },
		plantId: plant.id
	};
}

export function checkReproduction(
	plant: Cell,
	cells: readonly Cell[],
	settings: World['settings'],
	width: number, height: number
): { parent: Cell; childX: number; childY: number } | null {
	if (plant.type !== 'PLANT') return null;
	if (plant.energy < settings.reproductionThreshold) return null;

	const emptySpots = findEmptyNeighbors(cells, plant.x, plant.y, width, height);
	if (emptySpots.length === 0) return null;

	const spot = emptySpots[0];

	return {
		parent: { ...plant, energy: plant.energy - settings.reproductionCost },
		childX: spot.x,
		childY: spot.y
	};
}

export function computeNewPosition(
	cell: Cell,
	cells: readonly Cell[],
	settings: World['settings'],
	width: number, height: number,
	randomDir: { x: number; y: number }
): { newCell: Cell; moved: boolean } {
	if (cell.type === 'PLANT') {
		return { newCell: cell, moved: false };
	}

	const nearbyPositions = getNeighborsInRadius(cell.x, cell.y, settings.searchRadius, width, height);
	const plant = cells.find(c => c.type === 'PLANT' && nearbyPositions.some(n => n.x === c.x && n.y === c.y));

	let targetDir: { x: number; y: number } | null = null;

	if (plant) {
		targetDir = {
			x: Math.sign(plant.x - cell.x),
			y: Math.sign(plant.y - cell.y)
		};
	}

	const finalDir = targetDir ?? randomDir;
	const newX = wrapCoordinate(cell.x + finalDir.x, width);
	const newY = wrapCoordinate(cell.y + finalDir.y, height);

	const occupied = cells.some(c => c.x === newX && c.y === newY && c.id !== cell.id);
	if (occupied) {
		return { newCell: cell, moved: false };
	}

	return {
		newCell: {
			...cell,
			x: newX, y: newY,
			metadata: { ...cell.metadata, lastDirection: finalDir, age: cell.metadata.age + 1 }
		},
		moved: true
	};
}
