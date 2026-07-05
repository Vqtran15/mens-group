import { useRef } from "react";

/**
 * Combines single-tap, double-tap, and long-press detection on the same
 * pointer events. They share timing state so a fired long-press never also
 * counts as a tap toward the double-tap counter, and a confirmed double-tap
 * never also fires as a single tap.
 */
export function useMessageGestures({
  onDoubleTap,
  onLongPress,
  onSingleTap,
  longPressMs = 500,
  doubleTapMs = 300,
}: {
  onDoubleTap: () => void;
  onLongPress: () => void;
  onSingleTap?: () => void;
  longPressMs?: number;
  doubleTapMs?: number;
}) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const lastTapAt = useRef(0);

  function clearLongPressTimer() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function clearSingleTapTimer() {
    if (singleTapTimer.current) {
      clearTimeout(singleTapTimer.current);
      singleTapTimer.current = null;
    }
  }

  function onPointerDown() {
    longPressFired.current = false;
    clearLongPressTimer();
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onLongPress();
    }, longPressMs);
  }

  function onPointerUp() {
    clearLongPressTimer();
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    const now = Date.now();
    if (now - lastTapAt.current < doubleTapMs) {
      lastTapAt.current = 0;
      clearSingleTapTimer();
      onDoubleTap();
    } else {
      lastTapAt.current = now;
      // Don't fire a single tap immediately - wait to see whether a second
      // tap arrives within the double-tap window before committing to it.
      if (onSingleTap) {
        clearSingleTapTimer();
        singleTapTimer.current = setTimeout(() => {
          singleTapTimer.current = null;
          onSingleTap();
        }, doubleTapMs);
      }
    }
  }

  function onPointerLeave() {
    clearLongPressTimer();
  }

  return {
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel: onPointerLeave,
  };
}
