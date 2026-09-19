import { useCallback, useRef, useState } from 'react';

interface TouchDragState {
  taskId: string;
  taskTitle: string;
  ghostX: number;
  ghostY: number;
}

interface SlotInfo {
  fecha: string;
  hora: number;
}

const HOLD_MS = 250;

export function useTouchDrag(
  onDrop: (taskId: string, fecha: string, hora: number) => void,
) {
  const [drag, setDrag] = useState<TouchDragState | null>(null);
  const [overSlot, setOverSlot] = useState<string | null>(null);
  const holdTimer = useRef<number | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const taskRef = useRef<{ id: string; title: string } | null>(null);

  const clearHold = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  const findSlotUnder = useCallback((x: number, y: number): SlotInfo | null => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const slot = (el as HTMLElement).closest('[data-slot-fecha]') as HTMLElement | null;
    if (!slot) return null;
    const fecha = slot.dataset.slotFecha;
    const hora = slot.dataset.slotHora;
    if (!fecha || hora === undefined) return null;
    return { fecha, hora: parseInt(hora, 10) };
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent, taskId: string, taskTitle: string) => {
      const touch = e.touches[0];
      startPos.current = { x: touch.clientX, y: touch.clientY };
      taskRef.current = { id: taskId, title: taskTitle };
      isDragging.current = false;

      holdTimer.current = window.setTimeout(() => {
        isDragging.current = true;
        setDrag({
          taskId,
          taskTitle,
          ghostX: touch.clientX,
          ghostY: touch.clientY,
        });
      }, HOLD_MS);
    },
    [],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];

      if (!isDragging.current && startPos.current) {
        const dx = Math.abs(touch.clientX - startPos.current.x);
        const dy = Math.abs(touch.clientY - startPos.current.y);
        if (dx > 8 || dy > 8) {
          clearHold();
          return;
        }
      }

      if (!isDragging.current) return;

      e.preventDefault();

      setDrag((prev) =>
        prev ? { ...prev, ghostX: touch.clientX, ghostY: touch.clientY } : null,
      );

      const slot = findSlotUnder(touch.clientX, touch.clientY);
      setOverSlot(slot ? `${slot.fecha}-${slot.hora}` : null);
    },
    [clearHold, findSlotUnder],
  );

  const onTouchEnd = useCallback(() => {
    clearHold();

    if (isDragging.current && drag) {
      const slot = findSlotUnder(drag.ghostX, drag.ghostY);
      if (slot) {
        onDrop(drag.taskId, slot.fecha, slot.hora);
      }
    }

    isDragging.current = false;
    startPos.current = null;
    taskRef.current = null;
    setDrag(null);
    setOverSlot(null);
  }, [clearHold, drag, findSlotUnder, onDrop]);

  return {
    touchDrag: drag,
    touchOverSlot: overSlot,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
