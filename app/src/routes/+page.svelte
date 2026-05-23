<script lang="ts">
	import { onMount } from 'svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import { createInitialWorld } from '$lib/engine/universe';
	import { createSimulation } from '$lib/engine/simulation';
	import type { SimController } from '$lib/engine/simulation';
	import { TICK_RATE, HISTORY_SIZE, DEFAULT_SETTINGS, GRID_SIZE, INITIAL_SEEKERS, INITIAL_PLANTS, PRESETS } from '$lib/engine/data';
	import type { Cell, World, WorldSettings, WorldPreset } from '$lib/engine/data';

	const STORAGE_KEY = 'entropy-engine-state';

	interface PersistedState {
		seed: number;
		settings: WorldSettings;
		gridSize: number;
		initialSeekers: number;
		initialPlants: number;
		tickRate: number;
		presetIndex: number;
	}

	function loadState(): PersistedState | null {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return null;
			return JSON.parse(raw);
		} catch { return null; }
	}

	function saveState() {
		const idx = PRESETS.findIndex(p => p.name === selectedPreset.name);
		const state: PersistedState = {
			seed, settings: { ...settings }, gridSize,
			initialSeekers: initialSeekersCount,
			initialPlants: initialPlantsCount,
			tickRate, presetIndex: idx >= 0 ? idx : 0
		};
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
	}

	let world = $state(createInitialWorld());
	let history = $state<World[]>([]);
	let isRunning = $state(false);
	let tickRate = $state(TICK_RATE);
	let tickTime = $state(0);
	let seed = $state(12345);
	let settings = $state<WorldSettings>({ ...DEFAULT_SETTINGS });
	let selectedPreset = $state(PRESETS[0]);
	let gridSize = $state(GRID_SIZE);
	let initialSeekersCount = $state(INITIAL_SEEKERS);
	let initialPlantsCount = $state(INITIAL_PLANTS);
	let selectedCell = $state<Cell | null>(null);
	let sim: SimController;

	function handleCellClick(pos: { x: number; y: number }) {
		const cell = world.cells.find(c => c.x === pos.x && c.y === pos.y) ?? null;
		selectedCell = cell;
	}

	function onTick(newWorld: World, elapsed: number) {
		world = newWorld;
		tickTime = elapsed;
		history = [...history.slice(-(HISTORY_SIZE - 1)), newWorld];
		if (newWorld.cells.length === 0) {
			isRunning = false;
		}
	}

	onMount(() => {
		const loaded = loadState();
		if (loaded) {
			seed = loaded.seed;
			settings = { ...DEFAULT_SETTINGS, ...loaded.settings };
			gridSize = loaded.gridSize;
			initialSeekersCount = loaded.initialSeekers;
			initialPlantsCount = loaded.initialPlants;
			tickRate = loaded.tickRate;
			selectedPreset = PRESETS[loaded.presetIndex] ?? PRESETS[0];
		}
		world = createInitialWorld(gridSize, gridSize, settings, seed, initialSeekersCount, initialPlantsCount);
		sim = createSimulation(world, tickRate, onTick);
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
		const w = createInitialWorld(gridSize, gridSize, settings, seed, initialSeekersCount, initialPlantsCount);
		sim?.reset(w);
		history = [];
		isRunning = false;
		saveState();
	}

	const GOD_MODE_FIELDS = [
		{ key: 'entropyRateSeeker' as const, label: 'Seeker Entropy', min: 0.1, max: 5, step: 0.1, tip: 'Energy lost per tick as % of current energy. Higher = faster starvation.', fmt: (v: number) => v + '%' },
		{ key: 'entropyRatePlant' as const, label: 'Plant Entropy', min: 0.1, max: 5, step: 0.1, tip: 'Energy lost per tick as % of current energy for plants.', fmt: (v: number) => v + '%' },
		{ key: 'moveCost' as const, label: 'Move Cost', min: 0, max: 10, step: 1, tip: 'Energy deducted per successful move.', fmt: (v: number) => '' + v },
		{ key: 'eatGain' as const, label: 'Eat Gain', min: 5, max: 50, step: 1, tip: 'Energy gained when a seeker eats a plant.', fmt: (v: number) => '' + v },
		{ key: 'searchRadius' as const, label: 'Search Radius', min: 1, max: 5, step: 1, tip: 'How far seekers scan for plants (in cells).', fmt: (v: number) => '' + v },
		{ key: 'reproductionThreshold' as const, label: 'Reproduction Threshold', min: 50, max: 100, step: 1, tip: 'Minimum energy for a plant to reproduce.', fmt: (v: number) => '' + v },
		{ key: 'reproductionCost' as const, label: 'Reproduction Cost', min: 10, max: 80, step: 1, tip: 'Energy cost for a plant to spawn a child.', fmt: (v: number) => '' + v }
	];

	function syncSettings() {
		if (!sim) return;
		sim.updateSettings({
			entropyRateSeeker: settings.entropyRateSeeker,
			entropyRatePlant: settings.entropyRatePlant,
			moveCost: settings.moveCost,
			eatGain: settings.eatGain,
			searchRadius: settings.searchRadius,
			reproductionThreshold: settings.reproductionThreshold,
			reproductionCost: settings.reproductionCost
		});
		saveState();
	}

	function selectPreset(preset: WorldPreset) {
		selectedPreset = preset;
		seed = preset.seed;
		settings = { ...preset.settings };
		initialSeekersCount = preset.initialSeekers;
		initialPlantsCount = preset.initialPlants;
		reset();
		syncSettings();
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
				Preset:
				<select onchange={(e) => selectPreset(PRESETS[Number(e.target.value)])}>
					{#each PRESETS as preset, i}
						<option value={i} selected={preset.name === selectedPreset.name}>
							{preset.name}
						</option>
					{/each}
				</select>
			</label>
			<label data-tip="Simulation ticks per second">
				Tick Rate: {tickRate}/s
				<input type="range" min="1" max="60" bind:value={tickRate} onchange={saveState} />
			</label>
			<label data-tip="Master seed for deterministic world generation. Same seed = same initial layout.">
				Seed:
				<input type="number" bind:value={seed} onchange={saveState} />
			</label>
		</div>

		<div class="section">
			<h2>World</h2>
			<label data-tip="Width and height of the grid (requires reset)">
				Grid Size:
				<input type="number" min="5" max="100" bind:value={gridSize} onchange={saveState} />
			</label>
			<label data-tip="Number of seekers spawned at world creation (requires reset)">
				Initial Seekers:
				<input type="number" min="0" max="50" bind:value={initialSeekersCount} onchange={saveState} />
			</label>
			<label data-tip="Number of plants spawned at world creation (requires reset)">
				Initial Plants:
				<input type="number" min="0" max="100" bind:value={initialPlantsCount} onchange={saveState} />
			</label>
		</div>

		<div class="section">
			<h2>God Mode</h2>
			{#each GOD_MODE_FIELDS as { key, label, min, max, step, tip, fmt }}
				<label data-tip={tip}>
					{label}: {fmt(settings[key])}
					<input type="range" {min} {max} {step} value={settings[key]} oninput={(e) => { settings[key] = +e.target.value; }} onchange={syncSettings} />
				</label>
			{/each}
		</div>

		<div class="section stats">
			<h2>Stats</h2>
			<p>Tick: {world.tick}</p>
			<p>Seekers: {seekers}</p>
			<p>Plants: {plants}</p>
			<p>Dust: {dust}</p>
			<p>Total: {world.cells.length}</p>
			<p>ms/tick: {tickTime.toFixed(2)}</p>
		</div>

		{#if selectedCell}
			<div class="section inspector">
				<h2>Inspector</h2>
				<button class="dim" onclick={() => selectedCell = null}>click to dismiss</button>
				<p>ID: {selectedCell.id}</p>
				<p>Type: {selectedCell.type}</p>
				{#if selectedCell.species}
					<p>Species: {selectedCell.species}</p>
				{/if}
				<p>Energy: {selectedCell.energy}</p>
				<p>Position: ({selectedCell.x}, {selectedCell.y})</p>
				<p>Age: {selectedCell.metadata.age}</p>
				<p>Seed: {selectedCell.metadata.seed}</p>
				{#if selectedCell.metadata.lastDirection}
					<p>Direction: ({selectedCell.metadata.lastDirection.x}, {selectedCell.metadata.lastDirection.y})</p>
				{/if}
			</div>
		{/if}
	</aside>

	<main>
		<Canvas {world} cellSize={20} oncellclick={handleCellClick} />
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
		position: relative;
	}

	label[data-tip]:hover::after {
		content: attr(data-tip);
		position: absolute;
		bottom: calc(100% + 4px);
		left: 0;
		background: #222;
		color: #ccc;
		font-size: 0.75rem;
		padding: 4px 8px;
		border: 1px solid #444;
		border-radius: 4px;
		white-space: normal;
		z-index: 10;
		pointer-events: none;
		line-height: 1.3;
		max-width: 240px;
	}

	input[type="range"] {
		width: 100%;
		display: block;
		margin-top: 0.25rem;
	}

	input[type="number"], select {
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

	.stats p, .inspector p {
		margin: 0.25rem 0;
		font-size: 0.9rem;
	}

	.inspector {
		border-top: 1px solid #333;
		padding-top: 0.5rem;
	}

	.dim {
		color: #666;
		font-size: 0.75rem;
		padding: 0;
		margin: 0;
		background: none;
		border: none;
		cursor: pointer;
	}

	.dim:hover {
		color: #999;
	}

	main {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}
</style>
