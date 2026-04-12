import { signal } from '@preact/signals';

export type LocationHookType = 
  | 'useMemoryLocation' 
  | 'useMemoryLocationWithHistory' 
  | 'useHashLocation' 
  | 'useBrowserLocation';

export const locationHookType = signal<LocationHookType>('useMemoryLocationWithHistory');