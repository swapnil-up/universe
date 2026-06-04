# Architecture Deepening Opportunities

## ✅ 1. Race condition in `simulation.ts`
**Files:** `simulation.ts:47-52`, `simulation.ts:95-99`, `simulation.ts:106-109`

**Problem:** Worker responses from an in-flight tick overwrite `currentWorld` after `reset()` or `updateSettings()`. Sequence: user resets → stop() → cloneWorld(newWorld) → worker finishes old tick → onmessage overwrites with stale data → stale world goes to worker next tick. Same bug exists for updateSettings.

**Solution:** Use a generation counter. Increment on reset/updateSettings. Worker echoes it back; onmessage discards responses with stale generations.

**Status:** ✅ Fixed in `e19b2b2`

---

## ✅ 2. Duplicated spatial index (4× per tick)
**Files:** `universe.ts:213`, `universe.ts:379-382`, `universe.ts:441-445`, `universe.ts:249`

**Problem:** stageGrowthAndEntropy, stagePlantAgeLimit, stageAgent, and agentDecide each rebuild an occupied/spatial index from ctx.cells with identical cellKey iteration. 4× the same loop.

**Solution:** Thread the spatial index through TickContext so each stage reads/updates instead of rebuilding.

**Status:** ✅ Fixed in `16d4173`

---

## ✅ 3. Shallow abstractions (`pipe`, `times`, `applyEntropy`)
**Files:** `primitives.ts:5-7`, `primitives.ts:9-11`, `physics.ts:4-8`

**Problem:** These pass the deletion test — removing them concentrates complexity rather than scattering it. pipe is used once (obscures pipeline order), times is a one-liner Array.from wrapper, applyEntropy is a single arithmetic line.

**Solution:** Inline pipe → explicit function calls. Inline times. Merge applyEntropy into its single call site. Delete primitives.ts and physics.ts.

**Status:** ✅ Fixed in `724ef4b`

---

## ✅ 4. Module-level mutable state in `renderer.ts`
**Files:** `renderer.ts:57-60`

**Problem:** diffRenderer stores prevSnapshot, isFirstRender, prevGridWidth, prevGridHeight as module-level variables. Two parallel canvas components would corrupt each other's state.

**Solution:** Wrap diff state in an object created per diffRenderer() call.

**Status:** ✅ Fixed in `63582f8`

---

## ✅ 5. Agent pipeline order is invisible
**Files:** `universe.ts:426-459` (agent sub-phases), `universe.ts:489-494` (stage pipeline)

**Problem:** Correctness depends on the order of 4 pipeline stages and 5 agent sub-phases, but the order is concealed behind pipe and sequential function calls.

**Solution:** Inline pipe and document the ordering rationale with comments explaining why each stage precedes the next.

**Status:** ✅ Fixed in `1648e17`

---

## ✅ 6. `EventRing` buried in `+page.svelte`
**Files:** `+page.svelte:14-51`

**Problem:** A 10k-entry ring buffer with circular index math lives inside a Svelte component file.

**Solution:** Extract to `$lib/engine/event-ring.ts`. Export EventRing class with push, toReversedArray.

**Status:** ✅ Extracted to `$lib/engine/event-ring.ts`

---

## ✅ 7. God Mode fields manually maintained
**Files:** `+page.svelte:185-193`, `+page.svelte:197-205`

**Problem:** GOD_MODE_FIELDS and syncSettings separately enumerate every WorldSettings field. Adding a new setting requires updating 3 places. No type enforcement.

**Solution:** Derive GOD_MODE_FIELDS from DEFAULT_SETTINGS keys. Replace manual destructuring with `sim.updateSettings({ ...settings })`.

**Status:** ✅ Fixed — spread operator in syncSettings auto-includes all settings; GOD_MODE_FIELDS typed with `keyof WorldSettings`

---

## ✅ 8. Persistence has no versioning
**Files:** `+page.svelte:53-82`

**Problem:** PersistedState has no version field. Shape changes silently break loading. Empty catch blocks suppress all errors.

**Solution:** Add a version number. Validate on load. Log parse failures.

**Status:** ✅ Fixed — version field (1), validated on load, warnings logged on version mismatch or parse failure
