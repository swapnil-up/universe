export type CellType = 'SEEKER' | 'PLANT' | 'DUST';

export type Species = 'scout' | 'hunter' | 'drifter';

export const SPECIES: Species[] = ['scout', 'hunter', 'drifter'];

export interface SpeciesConfig {
	readonly perception: number;
}

export const SPECIES_CONFIG: Record<Species, SpeciesConfig> = {
	scout: { perception: 3 },
	hunter: { perception: 4 },
	drifter: { perception: 1 },
};

export interface Cell {
	readonly id: number;
	readonly type: CellType;
	readonly species?: Species;
	readonly energy: number;
	readonly x: number;
	readonly y: number;
	readonly metadata: {
		readonly lastDirection?: { x: number; y: number };
		readonly lastAction?: CellAction['type'];
		readonly lastReason?: string;
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
		readonly growthRatePlant: number;
	};
}

export interface WorldSettings {
	readonly entropyRateSeeker: number;
	readonly entropyRatePlant: number;
	readonly moveCost: number;
	readonly eatGain: number;
	readonly reproductionThreshold: number;
	readonly reproductionCost: number;
	readonly growthRatePlant: number;
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
	eatGain: 16,
	reproductionThreshold: 80,
	reproductionCost: 40,
	growthRatePlant: 2.0,
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
			growthRatePlant: 1.0,
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
			growthRatePlant: 3.0,
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
			growthRatePlant: 2.0,
		}
	}
];

export const GRID_SIZE = 20;
export const INITIAL_SEEKERS = 3;
export const INITIAL_PLANTS = 10;
export const DUST_TICKS = 5;
export const DUST_DECAY_RATE = 1;
export const INITIAL_CHILD_ENERGY = 40;
export const PLANT_MAX_AGE = 80;
export const POLLEN_RADIUS = 6;
export const CROWDING_THRESHOLD = 4;
export const CROWDING_PENALTY = 2.0;
export const CARNIVORE_GAIN_MULTIPLIER = 1.5;
export const SEEKER_REPRO_THRESHOLD = 88;
export const SEEKER_REPRO_COST = 45;
export const MUTATION_RATE = 0.1;
export const HISTORY_SIZE = 10;
export const TICK_RATE = 2;

export type CellAction =
	| { readonly type: 'WAIT'; readonly reason?: string }
	| { readonly type: 'MOVE'; readonly x: number; readonly y: number; readonly reason?: string }
	| { readonly type: 'EAT'; readonly targetId: number; readonly reason?: string }
	| { readonly type: 'REPRODUCE'; readonly childX: number; readonly childY: number; readonly reason?: string };

export interface Perception {
	readonly own: Cell;
	readonly nearbyPlants: readonly Cell[];
	readonly nearbySeekers: readonly Cell[];
	readonly emptyNeighbors: readonly Array<{ x: number; y: number }>;
	readonly settings: WorldSettings;
	readonly width: number;
	readonly height: number;
	readonly tick: number;
}

export type Decide = (perception: Perception, rand: number) => CellAction;