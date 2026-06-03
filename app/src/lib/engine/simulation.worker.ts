import { nextTick } from './universe';

self.onmessage = (e: MessageEvent<{ type: string; world: unknown }>) => {
	if (e.data.type !== 'tick') return;
	const result = nextTick(e.data.world as Parameters<typeof nextTick>[0]);
	self.postMessage({ type: 'tick-result', world: result.world, events: result.events });
};
