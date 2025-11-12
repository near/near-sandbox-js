# ESM/CJS Dual Module Build

This package now supports both CommonJS (CJS) and ECMAScript Modules (ESM) formats.

## Usage

### ESM (import)
```javascript
import { Sandbox, DEFAULT_ACCOUNT_ID } from 'near-sandbox';

const sandbox = await Sandbox.start({});
```

### CJS (require)
```javascript
const { Sandbox, DEFAULT_ACCOUNT_ID } = require('near-sandbox');

const sandbox = await Sandbox.start({});
```

## Build Output

Running `npm run build` generates:
- `dist/index.js` - CommonJS module
- `dist/index.mjs` - ES Module
- `dist/index.d.ts` - TypeScript types for CJS
- `dist/index.d.mts` - TypeScript types for ESM

## Configuration

The build is configured using `tsup` (see `tsup.config.ts`):
- Bundles both CJS and ESM formats in a single command
- Generates type definitions for both formats
- Cleans the output directory before each build
- Optimized for Node.js 16.9+

The `package.json` exports field ensures proper module resolution:
```json
{
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  }
}
```
