export type CellType = 'SEEKER' | 'PLANT' | 'DUST';

export interface Cell {
	readonly id: number;
	readonly type: CellType;
	readonly energy: number;
	readonly x: number;
	readonly y: number;
	readonly metadata: {
		readonly lastDirection?: { x: number; y: number };
		readonly age: number;
	};
}

export interface World {
	readonly tick: number;
	readonly width: number;
	readonly height: number;
	readonly cells: readonly Cell[];
	readonly settings: {
		readonly entropyRateSeeker: number;
		readonly entropyRatePlant: number;
		readonly moveCost: number;
		readonly eatGain: number;
		readonly reproductionThreshold: number;
		readonly reproductionCost: number;
		readonly searchRadius: number;
	};
}

export interface WorldSettings {
	entropyRateSeeker: number;
	entropyRatePlant: number;
	moveCost: number;
	eatGain: number;
	reproductionThreshold: number;
	reproductionCost: number;
	searchRadius: number;
}

export const DEFAULT_SETTINGS: WorldSettings = {
	entropyRateSeeker: 1.0,
	entropyRatePlant: 0.5,
	moveCost: 2,
	eatGain: 20,
	reproductionThreshold: 80,
	reproductionCost: 40,
	searchRadius: 1
};

export const GRID_SIZE = 20;
export const INITIAL_SEEKERS = 3;
export const INITIAL_PLANTS = 10;
export const HISTORY_SIZE = 10;
export const TICK_RATE = 2;