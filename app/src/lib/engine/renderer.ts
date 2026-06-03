import type { World, Species } from './data';

export interface Renderer {
	render(ctx: CanvasRenderingContext2D, world: World, cellSize: number): void;
}

const TYPE_HUE: Record<string, number> = {
	PLANT: 120,
	DUST: 0
};

const SPECIES_HUE: Record<Species, number> = {
	scout: 0,
	hunter: 30,
	drifter: 270
};

const SATURATION: Record<string, number> = {
	SEEKER: 75,
	PLANT: 70,
	DUST: 0
};

function energyColor(type: string, species: Species | undefined, energy: number): string {
	const h = species !== undefined ? (SPECIES_HUE[species] ?? 0) : (TYPE_HUE[type] ?? 0);
	const s = SATURATION[type] ?? 0;
	const ratio = Math.max(0, Math.min(1, energy / 100));
	const l = 10 + ratio * 40;
	return `hsl(${h}, ${s}%, ${l}%)`;
}

export const cellRenderer: Renderer = {
	render(ctx, world, cellSize) {
		ctx.fillStyle = '#1a1a1a';
		ctx.fillRect(0, 0, world.width * cellSize, world.height * cellSize);

		for (const cell of world.cells) {
			ctx.fillStyle = energyColor(cell.type, cell.species, cell.energy);
			ctx.fillRect(
				cell.x * cellSize,
				cell.y * cellSize,
				cellSize - 1,
				cellSize - 1
			);
		}
	}
};

type CellSnapshot = {
	readonly x: number;
	readonly y: number;
	readonly type: string;
	readonly species: Species | undefined;
	readonly energy: number;
};

let prevSnapshot = new Map<string, CellSnapshot>();
let isFirstRender = true;
let prevGridWidth = 0;
let prevGridHeight = 0;

export const diffRenderer: Renderer = {
	render(ctx, world, cellSize) {
		const snapshot = new Map<string, CellSnapshot>();
		for (const cell of world.cells) {
			snapshot.set(`${cell.x},${cell.y}`, {
				x: cell.x, y: cell.y,
				type: cell.type, species: cell.species,
				energy: cell.energy
			});
		}

		const gridChanged = isFirstRender
			|| world.width !== prevGridWidth
			|| world.height !== prevGridHeight;

		if (gridChanged) {
			ctx.fillStyle = '#1a1a1a';
			ctx.fillRect(0, 0, world.width * cellSize, world.height * cellSize);

			for (const cell of world.cells) {
				ctx.fillStyle = energyColor(cell.type, cell.species, cell.energy);
				ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize - 1, cellSize - 1);
			}

			prevSnapshot = snapshot;
			prevGridWidth = world.width;
			prevGridHeight = world.height;
			isFirstRender = false;
			return;
		}

		ctx.fillStyle = '#1a1a1a';
		for (const [key, prev] of prevSnapshot) {
			const curr = snapshot.get(key);
			if (!curr || curr.type !== prev.type || curr.species !== prev.species || curr.energy !== prev.energy) {
				const [x, y] = key.split(',').map(Number);
				ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
			}
		}

		for (const cell of world.cells) {
			const key = `${cell.x},${cell.y}`;
			const prev = prevSnapshot.get(key);
			if (!prev || prev.type !== cell.type || prev.species !== cell.species || prev.energy !== cell.energy) {
				ctx.fillStyle = energyColor(cell.type, cell.species, cell.energy);
				ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize - 1, cellSize - 1);
			}
		}

		prevSnapshot = snapshot;
	}
};
