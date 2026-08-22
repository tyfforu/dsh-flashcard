// Build script for dsh-flashcard.
//
// Produces two artifacts:
//   1. lib/index.js  — Host (Node) half, standard ESM. Externals:
//      node builtins + @deepseek-ai/* + ws/schemastery/zod (resolved at
//      runtime from the web profile's node_modules, exactly like
//      dsh-better-sidebar).
//   2. lib/client.js — Client (browser) half, wrapped in the DSH module
//      loader handoff `window.__ModuleLoader__.load({id, factory})` so the
//      runtime can resolve `react` etc. through the module table. The
//      banner/footer/intro triple is copied from the official
//      `clientBundle` preset (tsdown.client.ts in the deepseek-harness repo).
import { build } from 'esbuild'

const HOST_EXTERNAL = ['@deepseek-ai/*', 'ws', 'schemastery', 'zod']
const CLIENT_EXTERNAL = ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client']

async function main() {
  // ── Host half ────────────────────────────────────────────────────────────
  await build({
    entryPoints: ['src/index.ts'],
    outfile: 'lib/index.js',
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    external: HOST_EXTERNAL,
    sourcemap: true,
    legalComments: 'none',
  })

  // ── Client half ──────────────────────────────────────────────────────────
  await build({
    entryPoints: ['src/client/index.tsx'],
    outfile: 'lib/client.js',
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    external: CLIENT_EXTERNAL,
    jsx: 'automatic',
    sourcemap: true,
    legalComments: 'none',
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    banner: {
      js: 'window.__ModuleLoader__.load({ id: "dsh-flashcard", factory: (require) => {\nvar module = { exports: {} }; var exports = module.exports;',
    },
    footer: {
      js: 'return module.exports; } });',
    },
  })

  console.log('build ok: lib/index.js + lib/client.js')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
