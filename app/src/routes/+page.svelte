<script lang="ts">
	import { onMount } from 'svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import { createInitialWorld } from '$lib/engine/universe';
	import { createSimulation } from '$lib/engine/simulation';
	import type { SimController } from '$lib/engine/simulation';
	import { TICK_RATE, HISTORY_SIZE, DEFAULT_SETTINGS, GRID_SIZE } from '$lib/engine/data';
	import type { World, WorldSettings } from '$lib/engine/data';

	let world = $state(createInitialWorld());
	let history = $state<World[]>([]);
	let isRunning = $state(false);
	let tickRate = $state(TICK_RATE);
	let seed = $state(12345);
	let settings = $state<WorldSettings>({ ...DEFAULT_SETTINGS });
	let sim: SimController;

	function onTick(newWorld: World) {
		world = newWorld;
		history = [...history.slice(-(HISTORY_SIZE - 1)), newWorld];
		if (newWorld.cells.length === 0) {
			isRunning = false;
		}
	}

	onMount(() => {
		sim = createSimulation(world, seed, tickRate, onTick);
		return () => sim.destroy();
	});

	$effect(() => {
		if (sim) sim.setTickRate(tickRate);
	});

	function togglePlay() {
		if (isRunning) {
			sim.stop();
			isRunning = false;
		} else {
			sim.start();
			isRunning = true;
		}
	}

	function step() {
		if (isRunning) return;
		sim.step();
	}

	function reset() {
		const w = createInitialWorld(GRID_SIZE, GRID_SIZE, settings, seed);
		sim.reset(w, seed);
		history = [];
		isRunning = false;
	}

	function applySettings() {
		sim?.updateSettings(settings);
	}

	const seekers = $derived(world.cells.filter(c => c.type === 'SEEKER').length);
	const plants = $derived(world.cells.filter(c => c.type === 'PLANT').length);
	const dust = $derived(world.cells.filter(c => c.type === 'DUST').length);
</script>

<div class="container">
	<aside class="sidebar">
		<h1>The Entropy Engine</h1>

		<div class="section">
			<h2>Controls</h2>
			<button onclick={togglePlay}>{isRunning ? 'Pause' : 'Play'}</button>
			<button onclick={step}>Step</button>
			<button onclick={reset}>Reset</button>
		</div>

		<div class="section">
			<h2>Simulation</h2>
			<label>
				Tick Rate: {tickRate}/s
				<input type="range" min="1" max="60" bind:value={tickRate} />
			</label>
			<label>
				Seed:
				<input type="number" bind:value={seed} />
			</label>
		</div>

		<div class="section">
			<h2>God Mode</h2>
			<label>
				Seeker Entropy: {settings.entropyRateSeeker}%
				<input type="range" min="0.1" max="5" step="0.1" bind:value={settings.entropyRateSeeker} />
			</label>
			<label>
				Plant Entropy: {settings.entropyRatePlant}%
				<input type="range" min="0.1" max="5" step="0.1" bind:value={settings.entropyRatePlant} />
			</label>
			<label>
				Move Cost: {settings.moveCost}
				<input type="range" min="0" max="10" bind:value={settings.moveCost} />
			</label>
			<label>
				Eat Gain: {settings.eatGain}
				<input type="range" min="5" max="50" bind:value={settings.eatGain} />
			</label>
			<label>
				Search Radius: {settings.searchRadius}
				<input type="range" min="1" max="5" bind:value={settings.searchRadius} />
			</label>
			<label>
				Reproduction Threshold: {settings.reproductionThreshold}
				<input type="range" min="50" max="100" bind:value={settings.reproductionThreshold} />
			</label>
			<label>
				Reproduction Cost: {settings.reproductionCost}
				<input type="range" min="10" max="80" bind:value={settings.reproductionCost} />
			</label>
			<div class="button-group">
				<button onclick={applySettings}>Apply</button>
			</div>
		</div>

		<div class="section stats">
			<h2>Stats</h2>
			<p>Tick: {world.tick}</p>
			<p>Seekers: {seekers}</p>
			<p>Plants: {plants}</p>
			<p>Dust: {dust}</p>
			<p>Total: {world.cells.length}</p>
		</div>
	</aside>

	<main>
		<Canvas {world} cellSize={20} />
	</main>
</div>

<style>
	:global(html), :global(body) {
		margin: 0;
		padding: 0;
		height: 100%;
		font-family: system-ui, sans-serif;
		background: #0d0d0d;
		color: #eee;
	}

	.container {
		display: flex;
		height: 100vh;
		overflow: hidden;
	}

	.sidebar {
		width: 280px;
		flex-shrink: 0;
		padding: 1rem;
		background: #1a1a1a;
		overflow-y: auto;
		border-right: 1px solid #333;
	}

	.sidebar h1 {
		font-size: 1.2rem;
		margin: 0 0 1rem;
		color: #3498db;
	}

	.section {
		margin-bottom: 1.5rem;
	}

	.section h2 {
		font-size: 0.9rem;
		color: #888;
		margin: 0 0 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.85rem;
	}

	input[type="range"] {
		width: 100%;
		display: block;
		margin-top: 0.25rem;
	}

	input[type="number"] {
		width: 100%;
		padding: 0.25rem;
		background: #333;
		border: 1px solid #444;
		color: #eee;
	}

	button {
		padding: 0.5rem 1rem;
		margin-right: 0.25rem;
		margin-bottom: 0.25rem;
		background: #333;
		border: 1px solid #444;
		color: #eee;
		cursor: pointer;
		border-radius: 4px;
	}

	button:hover {
		background: #444;
	}

	.button-group {
		display: flex;
		flex-wrap: wrap;
	}

	.stats p {
		margin: 0.25rem 0;
		font-size: 0.9rem;
	}

	main {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}
</style>
