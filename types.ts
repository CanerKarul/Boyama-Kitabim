export enum AppScreen {
  Home = 'HOME',
  Loading = 'LOADING',
  Preview = 'PREVIEW',
}

export interface ColorInfo {
  hex: string;
  name: string;
}

export interface ColoringPage {
  imageUrl: string;
  title: string;
  description: string;
  colorPalette?: ColorInfo[];
}

export interface GenerationData {
  name: string;
  pageCount: number;
  theme: string;
  age: number;
  canWrite: boolean;
  specialTheme?: 'numbers' | 'letters' | null;
  specialThemeDetail?: string; // e.g., "1-10" or "A-Z"
}