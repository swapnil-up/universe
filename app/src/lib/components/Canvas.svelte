<script lang="ts">
	import type { World, Cell } from '$lib/engine/data';
	import { SPECIES_CONFIG } from '$lib/engine/data';
	import type { Renderer } from '$lib/engine/renderer';
	import { cellRenderer } from '$lib/engine/renderer';

	interface Props {
		world: World;
		cellSize?: number;
		renderer?: Renderer;
		oncellclick?: (pos: { x: number; y: number }) => void;
		selectedCell?: Cell | null;
	}

	let { world, cellSize = 20, renderer = cellRenderer, oncellclick, selectedCell }: Props = $props();

	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let panX = $state(0);
	let panY = $state(0);
	let zoom = $state(1);
	let dragging = false;
	let wasDrag = false;
	let dragStartX = 0;
	let dragStartY = 0;
	let panStartX = 0;
	let panStartY = 0;
	const DRAG_THRESHOLD = 3;

	const MIN_ZOOM = 0.2;
	const MAX_ZOOM = 5;

	$effect(() => {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		renderer.render(ctx, world, cellSize);

		if (selectedCell) {
			drawOverlay(ctx, selectedCell);
		}
	});

	function drawOverlay(ctx: CanvasRenderingContext2D, cell: Cell) {
		if (cell.type === 'SEEKER' && cell.species) {
			const config = SPECIES_CONFIG[cell.species];
			if (config) {
				const cx = cell.x * cellSize + cellSize / 2;
				const cy = cell.y * cellSize + cellSize / 2;
				const radius = config.perception * cellSize;

				ctx.beginPath();
				ctx.arc(cx, cy, radius, 0, Math.PI * 2);
				ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
				ctx.fill();
				ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
				ctx.lineWidth = 1;
				ctx.setLineDash([4, 4]);
				ctx.stroke();
				ctx.setLineDash([]);

				ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
				ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
			}
		}
	}

	function handleMouseDown(e: MouseEvent) {
		if (e.button !== 0) return;
		dragging = true;
		wasDrag = false;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		panStartX = panX;
		panStartY = panY;
	}

	function handleMouseMove(e: MouseEvent) {
		if (!dragging) return;
		const dx = e.clientX - dragStartX;
		const dy = e.clientY - dragStartY;
		if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
			wasDrag = true;
		}
		panX = panStartX + dx;
		panY = panStartY + dy;
	}

	function handleMouseUp() {
		dragging = false;
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const delta = -e.deltaY * 0.001;
		const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * (1 + delta)));
		if (newZoom === zoom) return;

		const rect = container.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;

		const worldX = (mx - panX) / zoom;
		const worldY = (my - panY) / zoom;

		panX = mx - worldX * newZoom;
		panY = my - worldY * newZoom;
		zoom = newZoom;
	}

	function handleClick(e: MouseEvent) {
		if (!canvas || !oncellclick || wasDrag) return;
		const rect = container.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;
		const gridX = Math.floor((mx - panX) / (cellSize * zoom));
		const gridY = Math.floor((my - panY) / (cellSize * zoom));
		if (gridX >= 0 && gridX < world.width && gridY >= 0 && gridY < world.height) {
			oncellclick({ x: gridX, y: gridY });
		}
	}
</script>

<div bind:this={container} class="canvas-container">
	<canvas
		bind:this={canvas}
		width={world.width * cellSize}
		height={world.height * cellSize}
		class="simulation-canvas"
		style="transform: translate({panX}px, {panY}px) scale({zoom}); transform-origin: 0 0;"
		onclick={handleClick}
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseUp}
		onwheel={handleWheel}
	></canvas>
</div>

<style>
	.canvas-container {
		overflow: hidden;
		position: relative;
		width: 100%;
		height: 100%;
		cursor: grab;
	}

	.canvas-container:active {
		cursor: grabbing;
	}

	.simulation-canvas {
		display: block;
		image-rendering: pixelated;
		border: 1px solid #333;
		position: absolute;
		top: 0;
		left: 0;
	}
</style>