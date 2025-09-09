// src/types/global.d.ts
export {};

declare global {
  interface Window {
    desktop: {
      getApiBase: () => Promise<string>;
    }
  }
}
