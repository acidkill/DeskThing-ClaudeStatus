import { useEffect, useRef } from 'react';

import { deskthing } from '../lib/deskthing';
import type { ServerToClient } from '../../shared/messages';

type ByType<T extends ServerToClient['type']> = Extract<ServerToClient, { type: T }>;

export const useDeskThingMessage = <T extends ServerToClient['type']>(
  type: T,
  handler: (msg: ByType<T>) => void,
): void => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const dispose = deskthing.on(type, (data) => {
      handlerRef.current(data as ByType<T>);
    });
    return () => {
      if (typeof dispose === 'function') dispose();
    };
  }, [type]);
};
