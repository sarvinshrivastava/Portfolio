import { createContext, useContext } from 'react';
import type { About } from '../types';

export const AboutContext = createContext<About | null>(null);
export const useAbout = () => useContext(AboutContext);
