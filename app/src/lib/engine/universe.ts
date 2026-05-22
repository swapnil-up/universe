import type { Cell, World, WorldSettings } from './data';
import { DEFAULT_SETTINGS, GRID_SIZE, INITIAL_SEEKERS, INITIAL_PLANTS } from './data';
export { GRID_SIZE } from './data';
import {
	applyEntropy, applyMoveCost,
	checkFeeding, checkReproduction,
	wrapCoordinate
} from './physics';
import { createRng, randomDirection, type Dir } from './rng';

interface TickContext {
	cells: Cell[];
	deadIds: Set<number>;
	nextId: number;
	width: number;
	height: number;
	settings: World['settings'];
	randomDir: () => Dir;
}

function pipe<T>(...fns: Array<(arg: T) => T>): (arg: T) => T {
	return (arg: T) => fns.reduce((acc, fn) => fn(acc), arg);
}

function times<T>(count: number, fn: (index: number) => T): T[] {
	return Array.from({ length: count }, (_, i) => fn(i));
}

export function createInitialWorld(
	width: number = GRID_SIZE,
	height: number = GRID_SIZE,
	settings: WorldSettings = DEFAULT_SETTINGS,
	seed: number = 12345
): World {
	const rng = createRng(seed);
	const cells = [
		...times(INITIAL_SEEKERS, (i) => ({
			id: i,
			type: 'SEEKER' as const,
			energy: 50 + Math.floor(rng() * 30),
			x: Math.floor(rng() * width),
			y: Math.floor(rng() * height),
			metadata: { age: 0 }
		})),
		...times(INITIAL_PLANTS, (i) => ({
			id: INITIAL_SEEKERS + i,
			type: 'PLANT' as const,
			energy: 40 + Math.floor(rng() * 40),
			x: Math.floor(rng() * width),
			y: Math.floor(rng() * height),
			metadata: { age: 0 }
		}))
	];

	return { tick: 0, width, height, cells, settings };
}

// ---- Pipeline stages ----

function stageEntropy(ctx: TickContext): TickContext {
	return {
		...ctx,
		cells: ctx.cells.map(c => applyEntropy(c, ctx.settings))
	};
}

function stageInteractions(ctx: TickContext): TickContext {
	const deadIds = new Set(ctx.deadIds);
	const cellMap = new Map(ctx.cells.map(c => [c.id, { ...c }] as const));

	const alivePlants = () => ctx.cells.filter(c => c.type === 'PLANT' && !deadIds.has(c.id));

	// Feeding: seekers eat plants within searchRadius
	for (const cell of ctx.cells) {
		if (cell.type !== 'SEEKER' || deadIds.has(cell.id)) continue;

		const result = checkFeeding(cell, alivePlants(), ctx.settings, ctx.width, ctx.height);
		if (result) {
			cellMap.set(cell.id, result.newSeeker);
			deadIds.add(result.plantId);
		}
	}

	// Reproduction: healthy plants spawn children
	let nextId = ctx.nextId;
	const spawns: Cell[] = [];

	for (const cell of ctx.cells) {
		if (cell.type !== 'PLANT' || deadIds.has(cell.id)) continue;

		const current = cellMap.get(cell.id)!;
		const result = checkReproduction(current, ctx.cells, ctx.settings, ctx.width, ctx.height);
		if (result) {
			cellMap.set(cell.id, result.parent);
			spawns.push({
				id: nextId++,
				type: 'PLANT',
				energy: 40,
				x: result.childX,
				y: result.childY,
				metadata: { age: 0 }
			});
		}
	}

	return {
		...ctx,
		cells: [...Array.from(cellMap.values()), ...spawns],
		deadIds,
		nextId
	};
}

function stageMovement(ctx: TickContext): TickContext {
	const cellMap = new Map(ctx.cells.map(c => [c.id, { ...c }] as const));

	// Track positions progressively to handle same-tick collisions
	const occupied = new Map<string, number>();
	for (const c of ctx.cells) {
		occupied.set(`${c.x},${c.y}`, c.id);
	}

	for (const cell of ctx.cells) {
		if (cell.type !== 'SEEKER' || ctx.deadIds.has(cell.id)) continue;

		const dir = ctx.randomDir();
		const newX = wrapCoordinate(cell.x + dir.x, ctx.width);
		const newY = wrapCoordinate(cell.y + dir.y, ctx.height);
		const key = `${newX},${newY}`;

		const occupant = occupied.get(key);
		if (occupant !== undefined && occupant !== cell.id) {
			continue; // spot taken — stay put, no move cost
		}

		// Move
		occupied.delete(`${cell.x},${cell.y}`);
		occupied.set(key, cell.id);

		const movedCell: Cell = {
			...cell,
			x: newX, y: newY,
			metadata: { ...cell.metadata, lastDirection: dir, age: cell.metadata.age + 1 }
		};
		cellMap.set(cell.id, applyMoveCost(movedCell, true, ctx.settings));
	}

	return {
		...ctx,
		cells: ctx.cells.map(c => cellMap.has(c.id) ? cellMap.get(c.id)! : c)
	};
}

function stageFilterDead(ctx: TickContext): TickContext {
	return {
		...ctx,
		cells: ctx.cells.filter(c => c.energy > 0 && !ctx.deadIds.has(c.id))
	};
}

// ---- Public API ----

export function nextTick(
	world: World,
	seed: number
): World {
	const rng = createRng(seed);
	const maxId = world.cells.reduce((max, c) => Math.max(max, c.id), 0);

	const ctx = pipe(
		stageEntropy,
		stageInteractions,
		stageMovement,
		stageFilterDead
	)({
		cells: [...world.cells],
		deadIds: new Set(),
		nextId: maxId + 1,
		width: world.width,
		height: world.height,
		settings: world.settings,
		randomDir: () => randomDirection(rng)
	});

	return {
		tick: world.tick + 1,
		width: world.width,
		height: world.height,
		cells: ctx.cells,
		settings: world.settings
	};
}
