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
}
