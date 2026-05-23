import type { Cell, World, WorldSettings, Species } from './data';
import { DEFAULT_SETTINGS, GRID_SIZE, INITIAL_SEEKERS, INITIAL_PLANTS, DUST_TICKS, SPECIES } from './data';
export { GRID_SIZE } from './data';
import {
	applyEntropy, applyMoveCost,
	checkFeeding, checkReproduction
} from './physics';
import { buildIndex } from './spatial';
import { wrapCoordinate } from './primitives';
import { createRng, randomDirection } from './rng';
import type { Dir } from './rng';

interface TickContext {
	cells: Cell[];
	deadIds: Set<number>;
	nextId: number;
	width: number;
	height: number;
	settings: World['settings'];
	tick: number;
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
	seed: number = 12345,
	initialSeekers: number = INITIAL_SEEKERS,
	initialPlants: number = INITIAL_PLANTS
): World {
	const rng = createRng(seed);
	let nextId = 0;
	const cells = [
		...times(initialSeekers, () => ({
			id: nextId++,
			type: 'SEEKER' as const,
			species: SPECIES[Math.floor(rng() * SPECIES.length)] as Species,
			energy: 50 + Math.floor(rng() * 30),
			x: Math.floor(rng() * width),
			y: Math.floor(rng() * height),
			metadata: { age: 0, seed: Math.floor(rng() * 0x7fffffff) }
		})),
		...times(initialPlants, () => ({
			id: nextId++,
			type: 'PLANT' as const,
			energy: 40 + Math.floor(rng() * 40),
			x: Math.floor(rng() * width),
			y: Math.floor(rng() * height),
			metadata: { age: 0, seed: Math.floor(rng() * 0x7fffffff) }
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

function stageFeeding(ctx: TickContext): TickContext {
	const deadIds = new Set(ctx.deadIds);
	const cellMap = new Map(ctx.cells.map(c => [c.id, { ...c }] as const));
	const index = buildIndex(ctx.cells);

	for (const cell of ctx.cells) {
		if (cell.type !== 'SEEKER' || deadIds.has(cell.id)) continue;

		const result = checkFeeding(cell, index, ctx.settings, ctx.width, ctx.height);
		if (result) {
			cellMap.set(cell.id, result.newSeeker);
			deadIds.add(result.plantId);
		}
	}

	return {
		...ctx,
		cells: ctx.cells.map(c => cellMap.has(c.id) ? cellMap.get(c.id)! : c),
		deadIds
	};
}

function stageReproduction(ctx: TickContext): TickContext {
	const deadIds = ctx.deadIds;
	const cellMap = new Map(ctx.cells.map(c => [c.id, { ...c }] as const));
	const index = buildIndex(ctx.cells);
	let nextId = ctx.nextId;
	const spawns: Cell[] = [];

	for (const cell of ctx.cells) {
		if (cell.type !== 'PLANT' || deadIds.has(cell.id)) continue;

		const current = cellMap.get(cell.id)!;
		const result = checkReproduction(current, index, ctx.settings, ctx.width, ctx.height);
		if (result) {
			cellMap.set(cell.id, result.parent);
			spawns.push({
				id: nextId++,
				type: 'PLANT',
				energy: 40,
				x: result.childX,
				y: result.childY,
				metadata: { age: 0, seed: current.metadata.seed + ctx.tick + 1 }
			});
		}
	}

	return {
		...ctx,
		cells: [...Array.from(cellMap.values()), ...spawns],
		nextId
	};
}

function movementDir(cell: Cell, index: Map<string, Cell>, settings: World['settings'], width: number, height: number, rng: () => number): Dir {
	const species: Species = cell.species ?? 'scout';

	if (species === 'drifter') return randomDirection(rng);

	const targetType = species === 'hunter' ? 'SEEKER' : 'PLANT';
	const excludeSelf = species === 'hunter';
	const targets = findInRadius(index, cell.x, cell.y, settings.searchRadius, width, height,
		c => c.type === targetType && (!excludeSelf || c.id !== cell.id));

	if (targets.length > 0) {
		const t = targets[0];
		const dx = Math.sign(t.x - cell.x);
		const dy = Math.sign(t.y - cell.y);
		if (dx === 0 && dy === 0) return randomDirection(rng);
		if (dx !== 0 && dy !== 0) {
			return rng() < 0.5 ? { x: dx, y: 0 } : { x: 0, y: dy };
		}
		return { x: dx, y: dy };
	}

	return randomDirection(rng);
}

function stageMovement(ctx: TickContext): TickContext {
	const cellMap = new Map(ctx.cells.map(c => [c.id, { ...c }] as const));
	const index = buildIndex(ctx.cells);

	const occupied = new Map<string, number>();
	for (const c of ctx.cells) {
		occupied.set(`${c.x},${c.y}`, c.id);
	}

	for (const cell of ctx.cells) {
		if (cell.type !== 'SEEKER' || ctx.deadIds.has(cell.id)) continue;

		const rng = createRng(cell.metadata.seed + ctx.tick);
		const dir = movementDir(cell, index, ctx.settings, ctx.width, ctx.height, rng);
		const newX = wrapCoordinate(cell.x + dir.x, ctx.width);
		const newY = wrapCoordinate(cell.y + dir.y, ctx.height);
		const key = `${newX},${newY}`;

		const occupant = occupied.get(key);
		if (occupant !== undefined && occupant !== cell.id) {
			continue;
		}

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

function stageDustLifecycle(ctx: TickContext): TickContext {
	const deadIds = ctx.deadIds;
	const next: Cell[] = [];

	for (const c of ctx.cells) {
		if (c.type === 'DUST' && c.energy <= 0) {
			continue;
		}
		if ((deadIds.has(c.id) || c.energy <= 0) && c.type !== 'DUST') {
			next.push({ id: c.id, type: 'DUST', energy: DUST_TICKS, x: c.x, y: c.y, metadata: { age: 0, seed: c.metadata.seed } });
			continue;
		}
		next.push(c);
	}

	return { ...ctx, cells: next, deadIds: new Set() };
}

// ---- Public API ----

export function nextTick(world: World): World {
	const ctx = pipe(
		stageEntropy,
		stageFeeding,
		stageReproduction,
		stageMovement,
		stageDustLifecycle
	)({
		cells: [...world.cells],
		deadIds: new Set(),
		nextId: world.cells.reduce((max, c) => Math.max(max, c.id), 0) + 1,
		width: world.width,
		height: world.height,
		settings: world.settings,
		tick: world.tick + 1
	});

	return {
		tick: ctx.tick,
		width: world.width,
		height: world.height,
		cells: ctx.cells,
		settings: world.settings
	};
}
