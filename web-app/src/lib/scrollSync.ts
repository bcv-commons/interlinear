/**
 * Proportional, instant, bidirectional scroll sync between two elements —
 * modeled on the Flutter app's ScrollSyncController +
 * panel_area/common/infinite_scroll_view.dart, which is what makes its
 * dual-panel sync feel "welded together" instead of laggy:
 *
 * - Proportional, not pixel-for-pixel: progress is `scrollTop / (scrollHeight
 *   - clientHeight)`, a 0..1 fraction of the way through each panel's own
 *   (differently sized — Hebrew wraps differently than English) scrollable
 *   range. Cheap to compute on every scroll event, no per-line geometry
 *   lookups needed.
 * - Instant, not animated: the passive panel's scrollTop is set directly
 *   (never `scrollTo({behavior: 'smooth'})`), so there's no tween lag
 *   between the two panels during a drag.
 * - Reentrancy-guarded rather than "active source" tracked: Flutter tracks
 *   which panel the user is physically touching via
 *   ScrollStartNotification/ScrollEndNotification. On the web there's no
 *   single gesture API covering mouse wheel + touch drag + keyboard +
 *   scrollbar drag + trackpad inertia uniformly, so instead each panel
 *   guards against reacting to a scroll event *it caused itself*: before
 *   writing to the other panel, set that panel's ignore flag; that panel's
 *   own scroll handler checks (and clears) its flag before deciding whether
 *   to propagate further. This gets the same no-feedback-loop guarantee
 *   without needing to enumerate input methods, and works identically for
 *   mouse, touch, keyboard, and scrollbar-drag scrolling.
 *
 * Extension point for step 2 (infinite/continuous cross-chapter scrolling):
 * right now each panel's entire scrollable content *is* one chapter, so
 * "proportional through the whole element" and "proportional through the
 * current chapter" are the same thing. Once panels can hold multiple
 * stacked chapters, swap in `progress`/`scrollTopForProgress`
 * implementations that resolve the currently-visible chapter element (e.g.
 * via `data-chapter` markers + getBoundingClientRect) and compute the
 * fraction relative to *that* element instead of the whole scroll
 * container — the reentrancy-guarded event-wiring below doesn't need to
 * change at all.
 */

export interface ScrollProgress {
	/** Returns how far scrolled through `el`'s content, from 0 (top) to 1 (bottom). */
	progress(el: HTMLElement): number;
	/** Returns the scrollTop `el` needs to be at `progress` through its content. */
	scrollTopForProgress(el: HTMLElement, progress: number): number;
}

const wholeElementProgress: ScrollProgress = {
	progress(el) {
		const range = el.scrollHeight - el.clientHeight;
		return range <= 0 ? 0 : el.scrollTop / range;
	},
	scrollTopForProgress(el, progress) {
		const range = el.scrollHeight - el.clientHeight;
		return range * progress;
	}
};

/** Ignore writes smaller than this — avoids float-precision jitter causing
 *  spurious back-and-forth scroll events between the two panels. */
const MIN_MEANINGFUL_DELTA_PX = 1;

export function syncScrollPanels(
	panelA: HTMLElement,
	panelB: HTMLElement,
	strategy: ScrollProgress = wholeElementProgress
): () => void {
	let ignoreA = false;
	let ignoreB = false;

	function mirror(source: HTMLElement, target: HTMLElement, clearIgnore: () => boolean) {
		if (clearIgnore()) return;
		const targetTop = strategy.scrollTopForProgress(target, strategy.progress(source));
		if (Math.abs(target.scrollTop - targetTop) < MIN_MEANINGFUL_DELTA_PX) return;
		if (target === panelA) ignoreA = true;
		else ignoreB = true;
		target.scrollTop = targetTop;
	}

	function onScrollA() {
		mirror(panelA, panelB, () => {
			const wasIgnoring = ignoreA;
			ignoreA = false;
			return wasIgnoring;
		});
	}

	function onScrollB() {
		mirror(panelB, panelA, () => {
			const wasIgnoring = ignoreB;
			ignoreB = false;
			return wasIgnoring;
		});
	}

	panelA.addEventListener('scroll', onScrollA, { passive: true });
	panelB.addEventListener('scroll', onScrollB, { passive: true });

	return () => {
		panelA.removeEventListener('scroll', onScrollA);
		panelB.removeEventListener('scroll', onScrollB);
	};
}

/** Resets both panels to the top without triggering a sync write (there's
 *  nothing meaningful to sync *from* on a chapter change — both should just
 *  start fresh at the top). Call this when the chapter being displayed
 *  changes, otherwise both panels keep whatever scroll position the
 *  *previous* chapter was left at, which reads as broken once the sync
 *  above is in place. */
export function resetScrollPanels(panelA: HTMLElement, panelB: HTMLElement): void {
	panelA.scrollTop = 0;
	panelB.scrollTop = 0;
}
