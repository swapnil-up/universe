const LOG_CAPACITY = 10000;

export class EventRing {
	readonly buffer = new Array<string>(LOG_CAPACITY);
	head = 0;
	count = 0;

	push(...items: string[]): void {
		for (const item of items) {
			this.buffer[this.head] = item;
			this.head = (this.head + 1) % LOG_CAPACITY;
			if (this.count < LOG_CAPACITY) this.count++;
		}
	}

	clear(): void {
		this.head = 0;
		this.count = 0;
	}

	toArray(): string[] {
		const result = new Array(this.count);
		const start = this.count < LOG_CAPACITY ? 0 : this.head;
		for (let i = 0; i < this.count; i++) {
			result[i] = this.buffer[(start + i) % LOG_CAPACITY];
		}
		return result;
	}

	toReversedArray(): string[] {
		const result = new Array(this.count);
		let idx = this.head - 1;
		for (let i = 0; i < this.count; i++) {
			if (idx < 0) idx = LOG_CAPACITY - 1;
			result[i] = this.buffer[idx];
			idx--;
		}
		return result;
	}
}