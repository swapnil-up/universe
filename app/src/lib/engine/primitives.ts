export function wrapCoordinate(value: number, max: number): number {
	return ((value % max) + max) % max;
}
