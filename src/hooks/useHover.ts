import { useEffect, useRef, useState } from 'react';

type HoverHook = [
  boolean,
  { onMouseEnter: () => void; onMouseLeave: () => void },
];

const useHover = (): HoverHook => {
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
      }
    },
    []
  );

  const eventHandlers = {
    onMouseEnter() {
      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => setHovered(true), 1000);
    },
    onMouseLeave() {
      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
      setHovered(false);
    },
  };

  return [hovered, eventHandlers];
};

export default useHover;
