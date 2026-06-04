import type { World } from './data';

function cloneWorld(w: World): World {
	return {
		tick: w.tick,
		width: w.width,
		height: w.height,
		cells: w.cells.map(c => ({
			id: c.id,
			type: c.type,
			species: c.species,
			energy: c.energy,
			x: c.x,
			y: c.y,
			metadata: { ...c.metadata }
		})),
		settings: { ...w.settings }
	};
}

export interface SimController {
	readonly world: World;
	readonly running: boolean;
	start(): void;
	stop(): void;
	step(): void;
	reset(world: World): void;
	setTickRate(rate: number): void;
	updateSettings(settings: World['settings']): void;
	destroy(): void;
}

export function createSimulation(
	initialWorld: World,
	tickRate: number,
	onTick: (world: World, elapsed: number, events: readonly string[]) => void,
): SimController {
	const worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' });

	let currentWorld = cloneWorld(initialWorld);
	let currentTickRate = tickRate;
	let isRunning = false;
	let timerId: ReturnType<typeof setTimeout> | null = null;
	let pending = false;
	let tickStart = 0;
	let generation = 0;

	worker.onmessage = (e: MessageEvent<{ type: string; world: World; events: string[]; generation: number }>) => {
		if (e.data.type !== 'tick-result') return;
		if (e.data.generation !== generation) return;
		pending = false;
		const elapsed = performance.now() - tickStart;
		currentWorld = e.data.world;
		onTick(currentWorld, elapsed, e.data.events);
		if (currentWorld.cells.length === 0) {
			stop();
		} else {
			scheduleNext();
		}
	};

	worker.onerror = (err) => {
		console.error('Simulation worker error:', err);
	};

	function tick() {
		if (pending) return;
		pending = true;
		tickStart = performance.now();
		worker.postMessage({ type: 'tick', world: currentWorld, generation });
	}

	function scheduleNext() {
		if (!isRunning) return;
		timerId = setTimeout(tick, 1000 / currentTickRate);
	}

	function start() {
		if (isRunning) return;
		isRunning = true;
		scheduleNext();
	}

	function stop() {
		isRunning = false;
		if (timerId !== null) {
			clearTimeout(timerId);
			timerId = null;
		}
	}

	function step() {
		if (isRunning) return;
		tick();
	}

	function reset(world: World) {
		stop();
		currentWorld = cloneWorld(world);
		pending = false;
		generation++;
		onTick(currentWorld, 0, []);
	}

	function setTickRate(rate: number) {
		currentTickRate = rate;
	}

	function updateSettings(settings: World['settings']) {
		currentWorld = { ...currentWorld, settings: { ...settings } };
		generation++;
		onTick(currentWorld, 0, []);
	}

	function destroy() {
		stop();
		worker.terminate();
	}

	return {
		get world() { return { ...currentWorld, cells: [...currentWorld.cells] }; },
		get running() { return isRunning; },
		start, stop, step, reset, setTickRate, updateSettings, destroy
	};
}
