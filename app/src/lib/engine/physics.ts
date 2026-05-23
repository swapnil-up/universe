import type { Cell, World } from './data';
import { findInRadius, findEmptyNeighbors } from './spatial';

export function applyEntropy(cell: Cell, settings: World['settings']): Cell {
	if (cell.type === 'DUST') {
		return { ...cell, energy: cell.energy - 1 };
	}
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
	index: Map<string, Cell>,
	settings: World['settings'],
	width: number, height: number
): { newSeeker: Cell; plantId: number } | null {
	const plants = findInRadius(index, seeker.x, seeker.y, settings.searchRadius, width, height, c => c.type === 'PLANT');
	if (plants.length === 0) return null;

	return {
		newSeeker: { ...seeker, energy: Math.min(100, seeker.energy + settings.eatGain) },
		plantId: plants[0].id
	};
}

export function checkReproduction(
	plant: Cell,
	index: Map<string, Cell>,
	settings: World['settings'],
	width: number, height: number
): { parent: Cell; childX: number; childY: number } | null {
	if (plant.type !== 'PLANT') return null;
	if (plant.energy < settings.reproductionThreshold) return null;

	const emptySpots = findEmptyNeighbors(index, plant.x, plant.y, width, height);
	if (emptySpots.length === 0) return null;

	const spot = emptySpots[0];

	return {
		parent: { ...plant, energy: plant.energy - settings.reproductionCost },
		childX: spot.x,
		childY: spot.y
	};
}
