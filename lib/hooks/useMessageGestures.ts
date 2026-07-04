import { useRef } from "react";

/**
 * Combines double-tap and long-press detection on the same pointer events.
 * They share timing state so a fired long-press never also counts as a tap
 * toward the double-tap counter, and vice versa.
 */
export function useMessageGestures({
  onDoubleTap,
  onLongPress,
  longPressMs = 500,
  doubleTapMs = 300,
}: {
  onDoubleTap: () => void;
  onLongPress: () => void;
  longPressMs?: number;
  doubleTapMs?: number;
}) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const lastTapAt = useRef(0);

  function clearLongPressTimer() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
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
      onDoubleTap();
    } else {
      lastTapAt.current = now;
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
