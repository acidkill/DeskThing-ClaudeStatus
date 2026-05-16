import { createDeskThing } from '@deskthing/client';

import type { ClientToServer, ServerToClient } from '../../shared/messages';

export const deskthing = createDeskThing<ServerToClient, ClientToServer>();
