/// <reference types="vite/client" />


// vite-env.d.ts
declare module "*.jsx" {
    const content: React.ComponentType;
    export default content;
  }
  