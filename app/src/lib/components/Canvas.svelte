<script lang="ts">
	import type { World } from '$lib/engine/data';
	import type { Renderer } from '$lib/engine/renderer';
	import { cellRenderer } from '$lib/engine/renderer';

	interface Props {
		world: World;
		cellSize?: number;
		renderer?: Renderer;
	}

	let { world, cellSize = 20, renderer = cellRenderer }: Props = $props();

	let canvas: HTMLCanvasElement;

	$effect(() => {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		renderer.render(ctx, world, cellSize);
	});
</script>

<canvas
	bind:this={canvas}
	width={world.width * cellSize}
	height={world.height * cellSize}
	class="simulation-canvas"
></canvas>

<style>
	.simulation-canvas {
		display: block;
		image-rendering: pixelated;
		border: 1px solid #333;
	}
</style>