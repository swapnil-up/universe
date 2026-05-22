import type { World } from './data';

export interface Renderer {
	render(ctx: CanvasRenderingContext2D, world: World, cellSize: number): void;
}

const COLORS: Record<string, string> = {
	SEEKER: '#e74c3c',
	PLANT: '#2ecc71',
	DUST: '#95a5a6'
};

export const cellRenderer: Renderer = {
	render(ctx, world, cellSize) {
		ctx.fillStyle = '#1a1a1a';
		ctx.fillRect(0, 0, world.width * cellSize, world.height * cellSize);

		for (const cell of world.cells) {
			const color = COLORS[cell.type] || '#fff';
			const alpha = Math.max(0.3, cell.energy / 100);
			ctx.fillStyle = color;
			ctx.globalAlpha = alpha;
			ctx.fillRect(
				cell.x * cellSize,
				cell.y * cellSize,
				cellSize - 1,
				cellSize - 1
			);
		}
		ctx.globalAlpha = 1;
	}
};
