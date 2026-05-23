import type { Cell, World } from './data';
import { DUST_DECAY_RATE } from './data';

export function applyEntropy(cell: Cell, settings: World['settings']): Cell {
	if (cell.type === 'DUST') {
		return { ...cell, energy: cell.energy - DUST_DECAY_RATE };
	}
	const baseRate = cell.type === 'SEEKER' ? settings.entropyRateSeeker : settings.entropyRatePlant;
	const decay = cell.energy * (baseRate / 100);
	return { ...cell, energy: Math.max(0, cell.energy - decay) };
}
