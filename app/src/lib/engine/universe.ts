import type { Cell, World, WorldSettings, Species, CellAction, Perception, Decide } from './data';
import { DEFAULT_SETTINGS, GRID_SIZE, INITIAL_SEEKERS, INITIAL_PLANTS, DUST_TICKS, DUST_DECAY_RATE, SPECIES, SPECIES_CONFIG, INITIAL_CHILD_ENERGY, PLANT_MAX_AGE, POLLEN_RADIUS, CROWDING_THRESHOLD, CROWDING_PENALTY, CARNIVORE_GAIN_MULTIPLIER, SEEKER_REPRO_THRESHOLD, SEEKER_REPRO_COST, MUTATION_RATE } from './data';
export { GRID_SIZE } from './data';
import { findInRadius, findEmptyNeighbors, cellKey, wrapCoordinate } from './spatial';
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
	readonly cellIndex: Map<string, Cell>;
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
		...Array.from({ length: initialSeekers }, () => ({
			id: nextId++,
			type: 'SEEKER' as const,
			species: SPECIES[Math.floor(nextRand() * SPECIES.length)] as Species,
			energy: 50 + Math.floor(nextRand() * 30),
			x: Math.floor(nextRand() * width),
			y: Math.floor(nextRand() * height),
			metadata: { age: 0, seed: Math.floor(nextRand() * 0x7fffffff) }
		})),
		...Array.from({ length: initialPlants }, () => ({
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
	const { own, nearbyPlants, settings, width, height, emptyNeighbors } = perception;

	if (own.energy >= SEEKER_REPRO_THRESHOLD && emptyNeighbors.length > 0) {
		return { type: 'REPRODUCE', childX: emptyNeighbors[0].x, childY: emptyNeighbors[0].y, reason: `scout repro (${Math.floor(own.energy)})` };
	}

	if (nearbyPlants.length > 0) {
		const nearest = nearbyPlants.reduce((a, b) =>
			(Math.abs(a.x - own.x) + Math.abs(a.y - own.y)) < (Math.abs(b.x - own.x) + Math.abs(b.y - own.y)) ? a : b
		);
		if (own.energy < settings.reproductionThreshold) {
			return { type: 'EAT', targetId: nearest.id, reason: `hungry (${Math.floor(own.energy)}<${settings.reproductionThreshold})` };
		}
		return moveToward(nearest, own, width, height, rand, `full (${Math.floor(own.energy)}), toward plant #${nearest.id}`);
	}

	return moveRandom(own, width, height, rand, own.metadata.lastDirection, 'no plants in range');
};

const hunterDecide: Decide = (perception, rand) => {
	const { own, nearbyPlants, nearbySeekers, settings, width, height, emptyNeighbors } = perception;
	const others = nearbySeekers.filter(c => c.id !== own.id);

	if (own.energy >= SEEKER_REPRO_THRESHOLD && emptyNeighbors.length > 0) {
		return { type: 'REPRODUCE', childX: emptyNeighbors[0].x, childY: emptyNeighbors[0].y, reason: `hunter repro (${Math.floor(own.energy)})` };
	}

	if (others.length > 0 && own.energy < settings.reproductionThreshold) {
		const nearest = others.reduce((a, b) =>
			(Math.abs(a.x - own.x) + Math.abs(a.y - own.y)) < (Math.abs(b.x - own.x) + Math.abs(b.y - own.y)) ? a : b
		);
		return { type: 'EAT', targetId: nearest.id, reason: `hunting #${nearest.id} (${Math.floor(own.energy)}<${settings.reproductionThreshold})` };
	}

	if (nearbyPlants.length > 0 && own.energy < settings.reproductionThreshold) {
		const nearest = nearbyPlants.reduce((a, b) =>
			(Math.abs(a.x - own.x) + Math.abs(a.y - own.y)) < (Math.abs(b.x - own.x) + Math.abs(b.y - own.y)) ? a : b
		);
		return { type: 'EAT', targetId: nearest.id, reason: `hungry (${Math.floor(own.energy)}<${settings.reproductionThreshold})` };
	}

	if (others.length > 0) {
		const nearest = others.reduce((a, b) =>
			(Math.abs(a.x - own.x) + Math.abs(a.y - own.y)) < (Math.abs(b.x - own.x) + Math.abs(b.y - own.y)) ? a : b
		);
		return moveToward(nearest, own, width, height, rand, `stalking #${nearest.id}`);
	}

	return moveRandom(own, width, height, rand, own.metadata.lastDirection, 'no targets in range');
};

const drifterDecide: Decide = (perception, rand) => {
	const { own, nearbyPlants, settings, width, height, emptyNeighbors } = perception;

	if (own.energy >= SEEKER_REPRO_THRESHOLD && emptyNeighbors.length > 0) {
		return { type: 'REPRODUCE', childX: emptyNeighbors[0].x, childY: emptyNeighbors[0].y, reason: `drifter repro (${Math.floor(own.energy)})` };
	}

	if (nearbyPlants.length > 0 && own.energy < settings.reproductionThreshold) {
		const nearest = nearbyPlants.reduce((a, b) =>
			(Math.abs(a.x - own.x) + Math.abs(a.y - own.y)) < (Math.abs(b.x - own.x) + Math.abs(b.y - own.y)) ? a : b
		);
		return { type: 'EAT', targetId: nearest.id, reason: `hungry (${Math.floor(own.energy)}<${settings.reproductionThreshold})` };
	}

	return moveRandom(own, width, height, rand, own.metadata.lastDirection, 'drifting');
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

function moveRandom(self: Cell, width: number, height: number, rand: number, lastDirection?: Dir, reason?: string): CellAction {
	const dir = (lastDirection && rand < 0.7) ? lastDirection : randomDir(rand);
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

function countNeighbors(x: number, y: number, occupied: Set<string>, width: number, height: number): number {
	let count = 0;
	for (let dx = -1; dx <= 1; dx++) {
		for (let dy = -1; dy <= 1; dy++) {
			if (dx === 0 && dy === 0) continue;
			const nx = wrapCoordinate(x + dx, width);
			const ny = wrapCoordinate(y + dy, height);
			if (occupied.has(cellKey(nx, ny))) count++;
		}
	}
	return count;
}

function stageGrowthAndEntropy(ctx: TickContext): TickContext {
	const occupied = new Set(ctx.cellIndex.keys());

	return {
		...ctx,
		cells: ctx.cells.map(c => {
			let cell = c;
			if (cell.type === 'PLANT') {
				const neighbors = countNeighbors(cell.x, cell.y, occupied, ctx.width, ctx.height);
				if (neighbors >= CROWDING_THRESHOLD) {
					const penalty = cell.energy * (CROWDING_PENALTY / 100);
					cell = { ...cell, energy: Math.max(0, cell.energy - penalty) };
				} else {
					const gain = cell.energy * (ctx.settings.growthRatePlant / 100);
					cell = { ...cell, energy: Math.min(100, cell.energy + gain) };
				}
			}
			if (cell.type === 'DUST') {
				cell = { ...cell, energy: cell.energy - DUST_DECAY_RATE };
			} else {
				const rate = cell.type === 'SEEKER' ? ctx.settings.entropyRateSeeker : ctx.settings.entropyRatePlant;
				cell = { ...cell, energy: Math.max(0, cell.energy - cell.energy * (rate / 100)) };
			}
			return { ...cell, metadata: { ...cell.metadata, age: cell.metadata.age + 1 } };
		})
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
	eats: Array<{ cellId: number; targetX: number; targetY: number }>;
}

function agentDecide(ctx: TickContext, s: AgentState): void {
	const index = ctx.cellIndex;
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
		const target = s.cellMap.get(action.targetId);
		if (!target) continue;

		const gain = cell.species === 'hunter' && target.type === 'SEEKER'
			? Math.round(settings.eatGain * CARNIVORE_GAIN_MULTIPLIER)
			: settings.eatGain;
		s.cellMap.set(cellId, { ...cell, energy: Math.min(100, cell.energy + gain) });
		s.deadIds.add(action.targetId);
		s.eats.push({ cellId, targetX: target.x, targetY: target.y });
		s.events.push(`#${cellId} ${cell.species ?? '?'} ate #${action.targetId} at (${target.x},${target.y})  |  ${action.reason}`);
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
			}
		});
		s.events.push(`#${cellId} ${cell.species ?? '?'} → (${action.x},${action.y})  |  ${action.reason}`);
	}
}

function applyPostEatStepIn(s: AgentState): void {
	for (const { cellId, targetX, targetY } of s.eats) {
		const cell = s.cellMap.get(cellId)!;
		const oldKey = cellKey(cell.x, cell.y);
		const newKey = cellKey(targetX, targetY);

		if (s.occupied.has(newKey)) continue;

		s.occupied.delete(oldKey);
		s.occupied.set(newKey, cellId);

		s.cellMap.set(cellId, {
			...cell,
			x: targetX, y: targetY,
			metadata: {
				...cell.metadata,
				lastDirection: { x: targetX - cell.x, y: targetY - cell.y },
			}
		});
	}
}

function agentReproduce(s: AgentState, ctx: TickContext): void {
	for (const { cellId, action } of s.actions) {
		if (action.type !== 'REPRODUCE') continue;
		if (s.deadIds.has(cellId)) continue;

		const cell = s.cellMap.get(cellId)!;
		const key = cellKey(action.childX, action.childY);
		const taken = s.occupied.has(key) || s.spawns.some(c => c.x === action.childX && c.y === action.childY);
		if (taken) continue;

		if (cell.type === 'PLANT') {
			if (cell.energy < ctx.settings.reproductionThreshold) continue;
			s.cellMap.set(cellId, { ...cell, energy: cell.energy - ctx.settings.reproductionCost });
			s.spawns.push({
				id: s.nextId++,
				type: 'PLANT',
				energy: INITIAL_CHILD_ENERGY,
				x: action.childX, y: action.childY,
				metadata: { age: 0, seed: cell.metadata.seed + ctx.tick + 1 }
			});
			s.occupied.set(key, -1);
			s.events.push(`#${cellId} plant → 🌱#${s.nextId - 1}  |  ${action.reason}`);
		} else if (cell.type === 'SEEKER') {
			if (cell.energy < SEEKER_REPRO_THRESHOLD) continue;
			const childSeed = cell.metadata.seed + ctx.tick + 1;
			const [mutRand] = nextRandom(childSeed);
			const childSpecies = mutRand < MUTATION_RATE
				? SPECIES.filter(s => s !== cell.species)[Math.floor(mutRand * (SPECIES.length - 1)) % (SPECIES.length - 1)]
				: (cell.species ?? 'scout');
			s.cellMap.set(cellId, { ...cell, energy: cell.energy - SEEKER_REPRO_COST });
			s.spawns.push({
				id: s.nextId++,
				type: 'SEEKER',
				species: childSpecies,
				energy: INITIAL_CHILD_ENERGY,
				x: action.childX, y: action.childY,
				metadata: { age: 0, seed: childSeed }
			});
			s.occupied.set(key, -1);
			s.events.push(`#${cellId} ${cell.species ?? 'scout'} → 🧬#${s.nextId - 1} (${childSpecies})  |  ${action.reason}`);
		}
	}
}

function stagePlantAgeLimit(ctx: TickContext): TickContext {
	const events: string[] = [];
	const occupied = new Set(ctx.cellIndex.keys());

	const cells: Cell[] = [];
	let nextId = ctx.nextId;

	for (const c of ctx.cells) {
		if (c.type !== 'PLANT' || c.metadata.age < PLANT_MAX_AGE) {
			cells.push(c);
			continue;
		}

		events.push(`#${c.id} plant died at tick ${ctx.tick} (age ${c.metadata.age})`);

		const targets: Array<{ x: number; y: number }> = [];
		for (let dx = -POLLEN_RADIUS; dx <= POLLEN_RADIUS; dx++) {
			for (let dy = -POLLEN_RADIUS; dy <= POLLEN_RADIUS; dy++) {
				if (dx === 0 && dy === 0) continue;
				if (dx * dx + dy * dy > POLLEN_RADIUS * POLLEN_RADIUS) continue;
				const nx = wrapCoordinate(c.x + dx, ctx.width);
				const ny = wrapCoordinate(c.y + dy, ctx.height);
				if (!occupied.has(cellKey(nx, ny))) {
					targets.push({ x: nx, y: ny });
				}
			}
		}

		if (targets.length > 0) {
			const [rand] = nextRandom(c.metadata.seed + ctx.tick);
			const target = targets[Math.floor(rand * targets.length)];
			cells.push({
				id: nextId++,
				type: 'PLANT',
				energy: INITIAL_CHILD_ENERGY,
				x: target.x, y: target.y,
				metadata: { age: 0, seed: c.metadata.seed + ctx.tick + 1 },
			});
			occupied.add(cellKey(target.x, target.y));
			events.push(`pollen → #${nextId - 1} at (${target.x},${target.y})`);
		}
	}

	return { ...ctx, cells, nextId, events: [...ctx.events, ...events] };
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
		eats: [],
	};

	// 1. All agents decide simultaneously from a snapshot — no agent sees another's decision this tick
	agentDecide(ctx, s);
	// 2. Eat resolves before move: eater consumes prey before it can flee (dead cells vacate position)
	agentEat(s, ctx.settings);

	// 3. Rebuild occupied map from survivors (eaten cells are gone, their positions are free)
	for (const c of ctx.cells) {
		if (!s.deadIds.has(c.id)) {
			s.occupied.set(cellKey(c.x, c.y), c.id);
		}
	}

	// 4. Step-in after occupied rebuild: eater moves onto vacated prey cell
	applyPostEatStepIn(s);

	// 5. Move after step-in so commands don't conflict; step-in uses the vacated position
	agentMove(s, ctx);
	// 6. Reproduction last: new cells appear at final positions after all movement resolves
	agentReproduce(s, ctx);

	const resultCells = [...Array.from(s.cellMap.values()), ...s.spawns];
	return {
		...ctx,
		cells: resultCells,
		cellIndex: new Map(resultCells.map(c => [cellKey(c.x, c.y), c] as const)),
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
	const cellIndex = new Map(world.cells.map(c => [cellKey(c.x, c.y), c] as const));
	const ctx = stageDustLifecycle(
		// Plant age limit after agents: eaten plants vanish this tick, only aged-out plants release pollen
		stagePlantAgeLimit(
			// Agent phase after growth: agents see current tick's energy levels when deciding
			stageAgent(
				// Growth first: plants charge energy before agents eat or decide
				stageGrowthAndEntropy({
					cells: world.cells,
					cellIndex,
					deadIds: new Set(),
					nextId: world.cells.reduce((max, c) => Math.max(max, c.id), 0) + 1,
					width: world.width,
					height: world.height,
					settings: world.settings,
					tick: world.tick + 1,
					events: [],
				}) // /stageGrowthAndEntropy
			) // /stageAgent
		) // /stagePlantAgeLimit
	); // /stageDustLifecycle

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
