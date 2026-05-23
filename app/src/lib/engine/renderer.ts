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
