import { createContext, useContext } from 'react';

// Portals share application state, but viewport and native controls belong to their host.
export const HostWindow = createContext<Window | null>(null);
export const useHostWindow = () => useContext(HostWindow) ?? window;
