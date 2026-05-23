import { nextTick } from './universe';
import type { World } from './data';

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
	onTick: (world: World, elapsed: number) => void,
): SimController {
	let currentWorld = initialWorld;
	let currentTickRate = tickRate;
	let isRunning = false;
	let intervalId: ReturnType<typeof setInterval> | null = null;

	function tick() {
		const start = performance.now();
		currentWorld = nextTick(currentWorld);
		const elapsed = performance.now() - start;
		onTick(currentWorld, elapsed);
		if (currentWorld.cells.length === 0) {
			stop();
		}
	}

	function start() {
		if (isRunning) return;
		isRunning = true;
		intervalId = setInterval(tick, 1000 / currentTickRate);
	}

	function stop() {
		isRunning = false;
		if (intervalId !== null) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	function step() {
		if (isRunning) return;
		tick();
	}

	function reset(world: World) {
		stop();
		currentWorld = world;
		onTick(currentWorld, 0);
	}

	function setTickRate(rate: number) {
		currentTickRate = rate;
		if (isRunning) {
			clearInterval(intervalId!);
			intervalId = setInterval(tick, 1000 / rate);
		}
	}

	function updateSettings(settings: World['settings']) {
		currentWorld = { ...currentWorld, settings: { ...settings } };
		onTick(currentWorld, 0);
	}

	function destroy() {
		stop();
	}

	return {
		get world() { return currentWorld; },
		get running() { return isRunning; },
		start, stop, step, reset, setTickRate, updateSettings, destroy
	};
}
