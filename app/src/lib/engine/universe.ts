import type { Cell, World, WorldSettings, Species, CellAction, Perception, Decide } from './data';
import { DEFAULT_SETTINGS, GRID_SIZE, INITIAL_SEEKERS, INITIAL_PLANTS, DUST_TICKS, SPECIES, SPECIES_CONFIG, INITIAL_CHILD_ENERGY } from './data';
export { GRID_SIZE } from './data';
import { applyEntropy } from './physics';
import { buildIndex, findInRadius, findEmptyNeighbors, cellKey } from './spatial';
import { wrapCoordinate, pipe, times } from './primitives';
import { nextRandom, randomDir } from './rng';
import type { Dir } from './rng';

interface TickContext {
	readonly cells: readonly Cell[];
	readonly deadIds: ReadonlySet<number>;
	readonly nextId: number;
	readonly width: number;
	readonly height: number;
	readonly settings: World['settings'];
	readonly tick: number;
	readonly events: readonly string[];
}

// ---- Initial world ----

export function createInitialWorld(
	width: number = GRID_SIZE,
	height: number = GRID_SIZE,
	settings: WorldSettings = DEFAULT_SETTINGS,
	seed: number = 12345,
	initialSeekers: number = INITIAL_SEEKERS,
	initialPlants: number = INITIAL_PLANTS
): World {
	let state = seed | 0;
	function nextRand(): number {
		const [v, s] = nextRandom(state);
		state = s;
		return v;
	}
	let nextId = 0;
	const cells = [
		...times(initialSeekers, () => ({
			id: nextId++,
			type: 'SEEKER' as const,
			species: SPECIES[Math.floor(nextRand() * SPECIES.length)] as Species,
			energy: 50 + Math.floor(nextRand() * 30),
			x: Math.floor(nextRand() * width),
			y: Math.floor(nextRand() * height),
			metadata: { age: 0, seed: Math.floor(nextRand() * 0x7fffffff) }
		})),
		...times(initialPlants, () => ({
			id: nextId++,
			type: 'PLANT' as const,
			energy: 40 + Math.floor(nextRand() * 40),
			x: Math.floor(nextRand() * width),
			y: Math.floor(nextRand() * height),
			metadata: { age: 0, seed: Math.floor(nextRand() * 0x7fffffff) }
		}))
	];

	return { tick: 0, width, height, cells, settings };
}

// ---- Decision functions ----

function toward(target: Cell, self: Cell, rand: number): Dir {
	const dx = Math.sign(target.x - self.x);
	const dy = Math.sign(target.y - self.y);
	if (dx === 0 && dy === 0) return randomDir(rand);
	if (dx !== 0 && dy !== 0) return rand < 0.5 ? { x: dx, y: 0 } : { x: 0, y: dy };
	return { x: dx, y: dy };
}

const scoutDecide: Decide = (perception, rand) => {
	const { own, nearbyPlants, settings, width, height } = perception;

	if (nearbyPlants.length > 0) {
		if (own.energy < settings.reproductionThreshold) {
			return { type: 'EAT', targetId: nearbyPlants[0].id, reason: `hungry (${Math.floor(own.energy)}<${settings.reproductionThreshold})` };
		}
		return moveToward(nearbyPlants[0], own, width, height, rand, `full (${Math.floor(own.energy)}), toward plant #${nearbyPlants[0].id}`);
	}

	return moveRandom(own, width, height, rand, 'no plants in range');
};

const hunterDecide: Decide = (perception, rand) => {
	const { own, nearbyPlants, nearbySeekers, settings, width, height } = perception;
	const others = nearbySeekers.filter(c => c.id !== own.id);

	if (nearbyPlants.length > 0 && own.energy < settings.reproductionThreshold) {
		return { type: 'EAT', targetId: nearbyPlants[0].id, reason: `hungry (${Math.floor(own.energy)}<${settings.reproductionThreshold})` };
	}

	if (others.length > 0) {
		return moveToward(others[0], own, width, height, rand, `chasing #${others[0].id}`);
	}

	return moveRandom(own, width, height, rand, 'no targets in range');
};

const drifterDecide: Decide = (perception, rand) => {
	const { own, nearbyPlants, settings, width, height } = perception;

	if (nearbyPlants.length > 0 && own.energy < settings.reproductionThreshold) {
		return { type: 'EAT', targetId: nearbyPlants[0].id, reason: `hungry (${Math.floor(own.energy)}<${settings.reproductionThreshold})` };
	}

	return moveRandom(own, width, height, rand, 'drifting');
};

const plantDecide: Decide = (perception, _rand) => {
	const { own, emptyNeighbors, settings } = perception;
	if (own.energy >= settings.reproductionThreshold && emptyNeighbors.length > 0) {
		return { type: 'REPRODUCE', childX: emptyNeighbors[0].x, childY: emptyNeighbors[0].y, reason: `energy ${Math.floor(own.energy)}≥${settings.reproductionThreshold}` };
	}
	if (own.energy < settings.reproductionThreshold) {
		return { type: 'WAIT', reason: `charging (${Math.floor(own.energy)}<${settings.reproductionThreshold})` };
	}
	return { type: 'WAIT', reason: 'no room to sprout' };
};

function moveToward(target: Cell, self: Cell, width: number, height: number, rand: number, reason?: string): CellAction {
	const dir = toward(target, self, rand);
	return {
		type: 'MOVE',
		x: wrapCoordinate(self.x + dir.x, width),
		y: wrapCoordinate(self.y + dir.y, height),
		reason,
	};
}

function moveRandom(self: Cell, width: number, height: number, rand: number, reason?: string): CellAction {
	const dir = randomDir(rand);
	return {
		type: 'MOVE',
		x: wrapCoordinate(self.x + dir.x, width),
		y: wrapCoordinate(self.y + dir.y, height),
		reason,
	};
}

function decideFor(cell: Cell): Decide {
	if (cell.type === 'PLANT') return plantDecide;
	const species: Species = cell.species ?? 'scout';
	switch (species) {
		case 'hunter': return hunterDecide;
		case 'drifter': return drifterDecide;
		default: return scoutDecide;
	}
}

// ---- Perception ----

function perceive(cell: Cell, index: Map<string, Cell>, ctx: TickContext, radius: number): Perception {
	return {
		own: cell,
		nearbyPlants: findInRadius(index, cell.x, cell.y, radius, ctx.width, ctx.height, c => c.type === 'PLANT'),
		nearbySeekers: findInRadius(index, cell.x, cell.y, radius, ctx.width, ctx.height, c => c.type === 'SEEKER'),
		emptyNeighbors: findEmptyNeighbors(index, cell.x, cell.y, ctx.width, ctx.height),
		settings: ctx.settings,
		width: ctx.width,
		height: ctx.height,
		tick: ctx.tick,
	};
}

// ---- Pipeline stages ----

function stageGrowth(ctx: TickContext): TickContext {
	return {
		...ctx,
		cells: ctx.cells.map(c => {
			if (c.type !== 'PLANT') return c;
			const gain = c.energy * (ctx.settings.growthRatePlant / 100);
			return { ...c, energy: Math.min(100, c.energy + gain) };
		})
	};
}

function stageEntropy(ctx: TickContext): TickContext {
	return {
		...ctx,
		cells: ctx.cells.map(c => applyEntropy(c, ctx.settings))
	};
}

interface AgentState {
	cellMap: Map<number, Cell>;
	deadIds: Set<number>;
	occupied: Map<string, number>;
	nextId: number;
	spawns: Cell[];
	events: string[];
	actions: Array<{ cellId: number; action: CellAction }>;
}

function agentDecide(ctx: TickContext, s: AgentState): void {
	const index = buildIndex(ctx.cells);
	for (const cell of ctx.cells) {
		if (s.deadIds.has(cell.id)) continue;
		if (cell.type === 'DUST') continue;

		const decide = decideFor(cell);
		const pRadius = cell.type === 'PLANT' ? 1 : (SPECIES_CONFIG[cell.species ?? 'scout']?.perception ?? 3);
		const perception = perceive(cell, index, ctx, pRadius);
		const [rand] = nextRandom(cell.metadata.seed + ctx.tick);
		const action = decide(perception, rand);
		s.cellMap.set(cell.id, { ...cell, metadata: { ...cell.metadata, lastAction: action.type, lastReason: action.reason } });
		s.actions.push({ cellId: cell.id, action });
	}
}

function agentEat(s: AgentState, settings: World['settings']): void {
	for (const { cellId, action } of s.actions) {
		if (action.type !== 'EAT') continue;
		if (s.deadIds.has(action.targetId)) continue;

		const cell = s.cellMap.get(cellId)!;
		s.cellMap.set(cellId, { ...cell, energy: Math.min(100, cell.energy + settings.eatGain) });
		s.deadIds.add(action.targetId);
		s.events.push(`#${cellId} ${cell.species ?? '?'} ate #${action.targetId}  |  ${action.reason}`);
	}
}

function agentMove(s: AgentState, ctx: TickContext): void {
	for (const { cellId, action } of s.actions) {
		if (action.type !== 'MOVE') continue;
		if (s.deadIds.has(cellId)) continue;

		const cell = s.cellMap.get(cellId)!;
		const key = cellKey(action.x, action.y);
		if (s.occupied.has(key)) {
			s.events.push(`#${cellId} ${cell.species ?? '?'} blocked  |  ${action.reason}`);
			continue;
		}

		s.occupied.delete(cellKey(cell.x, cell.y));
		s.occupied.set(key, cellId);

		s.cellMap.set(cellId, {
			...cell,
			x: action.x, y: action.y,
			energy: Math.max(0, cell.energy - ctx.settings.moveCost),
			metadata: {
				...cell.metadata,
				lastDirection: { x: action.x - cell.x, y: action.y - cell.y },
				age: cell.metadata.age + 1
			}
		});
		s.events.push(`#${cellId} ${cell.species ?? '?'} → (${action.x},${action.y})  |  ${action.reason}`);
	}
}

function agentReproduce(s: AgentState, ctx: TickContext): void {
	for (const { cellId, action } of s.actions) {
		if (action.type !== 'REPRODUCE') continue;
		if (s.deadIds.has(cellId)) continue;

		const cell = s.cellMap.get(cellId)!;
		if (cell.energy < ctx.settings.reproductionThreshold) continue;

		const key = cellKey(action.childX, action.childY);
		const taken = s.occupied.has(key) || s.spawns.some(c => c.x === action.childX && c.y === action.childY);
		if (taken) continue;

		s.cellMap.set(cellId, { ...cell, energy: cell.energy - ctx.settings.reproductionCost });
		s.spawns.push({
			id: s.nextId++,
			type: 'PLANT',
			energy: INITIAL_CHILD_ENERGY,
			x: action.childX,
			y: action.childY,
			metadata: { age: 0, seed: cell.metadata.seed + ctx.tick + 1 }
		});
		s.occupied.set(key, -1);
		s.events.push(`#${cellId} plant → 🌱#${s.nextId - 1}  |  ${action.reason}`);
	}
}

function stageAgent(ctx: TickContext): TickContext {
	const s: AgentState = {
		cellMap: new Map(ctx.cells.map(c => [c.id, { ...c }] as const)),
		deadIds: new Set(ctx.deadIds),
		occupied: new Map<string, number>(),
		nextId: ctx.nextId,
		spawns: [],
		events: [],
		actions: [],
	};

	agentDecide(ctx, s);
	agentEat(s, ctx.settings);

	for (const c of ctx.cells) {
		if (!s.deadIds.has(c.id)) {
			s.occupied.set(cellKey(c.x, c.y), c.id);
		}
	}

	agentMove(s, ctx);
	agentReproduce(s, ctx);

	return {
		...ctx,
		cells: [...Array.from(s.cellMap.values()), ...s.spawns],
		deadIds: s.deadIds,
		nextId: s.nextId,
		events: [...ctx.events, ...s.events],
	};
}

function stageDustLifecycle(ctx: TickContext): TickContext {
	const deadIds = ctx.deadIds;
	const next: Cell[] = [];
	const events: string[] = [];

	for (const c of ctx.cells) {
		if (c.type === 'DUST') {
			if (c.energy <= 0) {
				events.push(`#${c.id} dust faded`);
				continue;
			}
			next.push(c);
			continue;
		}
		if (deadIds.has(c.id) || c.energy <= 0) {
			next.push({ id: c.id, type: 'DUST', energy: DUST_TICKS, x: c.x, y: c.y, metadata: { age: 0, seed: c.metadata.seed } });
			events.push(`#${c.id} ${c.species ?? c.type} → dust`);
			continue;
		}
		next.push(c);
	}

	return { ...ctx, cells: next, deadIds: new Set(), events: [...ctx.events, ...events] };
}

// ---- Public API ----

export function nextTick(world: World): { world: World; events: readonly string[] } {
	const ctx = pipe(
		stageGrowth,
		stageEntropy,
		stageAgent,
		stageDustLifecycle
	)({
		cells: [...world.cells],
		deadIds: new Set(),
		nextId: world.cells.reduce((max, c) => Math.max(max, c.id), 0) + 1,
		width: world.width,
		height: world.height,
		settings: world.settings,
		tick: world.tick + 1,
		events: [],
	});

	return {
		world: {
			tick: ctx.tick,
			width: world.width,
			height: world.height,
			cells: ctx.cells,
			settings: world.settings
		},
		events: ctx.events,
	};
}
