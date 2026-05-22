import { nextTick } from './universe';
import type { World } from './data';

export interface SimController {
	readonly world: World;
	readonly running: boolean;
	start(): void;
	stop(): void;
	step(): void;
	reset(world: World, seed: number): void;
	setTickRate(rate: number): void;
	updateSettings(settings: World['settings']): void;
	destroy(): void;
}

export function createSimulation(
	initialWorld: World,
	initialSeed: number,
	tickRate: number,
	onTick: (world: World) => void,
): SimController {
	let currentWorld = initialWorld;
	let currentSeed = initialSeed;
	let currentTickRate = tickRate;
	let isRunning = false;
	let intervalId: ReturnType<typeof setInterval> | null = null;

	function tick() {
		currentWorld = nextTick(currentWorld, currentSeed + currentWorld.tick);
		onTick(currentWorld);
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

	function reset(world: World, seed: number) {
		stop();
		currentWorld = world;
		currentSeed = seed;
		onTick(currentWorld);
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
		onTick(currentWorld);
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
