export type CellType = 'SEEKER' | 'PLANT' | 'DUST';

export type Species = 'scout' | 'hunter' | 'drifter';

export const SPECIES: Species[] = ['scout', 'hunter', 'drifter'];

export interface Cell {
	readonly id: number;
	readonly type: CellType;
	readonly species?: Species;
	readonly energy: number;
	readonly x: number;
	readonly y: number;
	readonly metadata: {
		readonly lastDirection?: { x: number; y: number };
		readonly age: number;
		readonly seed: number;
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
	readonly entropyRateSeeker: number;
	readonly entropyRatePlant: number;
	readonly moveCost: number;
	readonly eatGain: number;
	readonly reproductionThreshold: number;
	readonly reproductionCost: number;
	readonly searchRadius: number;
}

export interface WorldPreset {
	readonly name: string;
	readonly description: string;
	readonly seed: number;
	readonly initialSeekers: number;
	readonly initialPlants: number;
	readonly settings: WorldSettings;
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

export const PRESETS: WorldPreset[] = [
	{
		name: 'Default',
		description: 'Balanced start',
		seed: 12345,
		initialSeekers: 3,
		initialPlants: 10,
		settings: DEFAULT_SETTINGS
	},
	{
		name: 'Barren',
		description: 'Sparse resources, high entropy',
		seed: 42,
		initialSeekers: 5,
		initialPlants: 4,
		settings: {
			entropyRateSeeker: 2.0,
			entropyRatePlant: 1.5,
			moveCost: 3,
			eatGain: 15,
			reproductionThreshold: 90,
			reproductionCost: 50,
			searchRadius: 2
		}
	},
	{
		name: 'Lush',
		description: 'Abundant plants, low entropy',
		seed: 99,
		initialSeekers: 2,
		initialPlants: 20,
		settings: {
			entropyRateSeeker: 0.5,
			entropyRatePlant: 0.2,
			moveCost: 1,
			eatGain: 25,
			reproductionThreshold: 60,
			reproductionCost: 30,
			searchRadius: 3
		}
	},
	{
		name: 'Competitive',
		description: 'Many seekers, scarce food',
		seed: 77,
		initialSeekers: 10,
		initialPlants: 5,
		settings: {
			entropyRateSeeker: 0.8,
			entropyRatePlant: 1.0,
			moveCost: 2,
			eatGain: 30,
			reproductionThreshold: 85,
			reproductionCost: 45,
			searchRadius: 2
		}
	}
];

export const GRID_SIZE = 20;
export const INITIAL_SEEKERS = 3;
export const INITIAL_PLANTS = 10;
export const DUST_TICKS = 5;
export const HISTORY_SIZE = 10;
export const TICK_RATE = 2;