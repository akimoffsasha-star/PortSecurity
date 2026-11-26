/**
 * Vite + @vitejs/plugin-legacy
 *
 * Подвійний режим:
 * 1) Джерело (index.html + класичні <script>) — file:// і start.sh/bat без змін.
 * 2) npm run build → dist/ :
 *    - CSS мінімізований
 *    - класичні js/* розбиті на 3 чанки (code splitting), порядок збережено:
 *      assets/app-core.js → app-features.js → app-shell.js
 *      (глобальний lexical scope, як окремі <script>, без eval)
 *    - ESM entry (legacy-entry) + @vitejs/plugin-legacy: modern/legacy + manualChunks(vendor)
 *
 * Rollup input: index.html
 * Ручний chunking класики — плагін classicScriptsBundle (не ESM scope).
 */

import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, existsSync } from 'node:fs'
import { transformSync } from 'esbuild'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Порядок як у index.html — критично для залежностей */
const CLASSIC_SCRIPTS = [
  'js/config.js',
  'js/state.js',
  'js/core/utils.js',
  'js/core/domain.js',
  'js/ui/animations.js',
  'js/ui/feedback.js',
  'js/ui/virtual-table.js',
  'js/data/cache.js',
  'js/data/loader.js',
  'js/data/realtime.js',
  'js/features/settings.js',
  'js/features/filters.js',
  'js/features/dashboard/chart-theme.js',
  'js/features/dashboard/dashboard.js',
  'js/features/dashboard/charts.js',
  'js/features/facilities/registry.js',
  'js/features/facilities/columns.js',
  'js/features/facilities/bulk.js',
  'js/features/facilities/modal.js',
  'js/features/facilities/duplicates.js',
  'js/features/admin/ports.js',
  'js/features/admin/audit.js',
  'js/features/admin/backup.js',
  'js/features/inspections.js',
  'js/features/calendar.js',
  'js/features/vessels.js',
  'js/features/gisis.js',
  'js/export/excel.js',
  'js/export/report.js',
  'js/views/registry.js',
  'js/views/tab-dashboard.js',
  'js/views/tab-facilities.js',
  'js/views/tab-inspections.js',
  'js/views/tab-calendar.js',
  'js/views/tab-vessels.js',
  'js/views/modals-core.js',
  'js/views/modals-tools.js',
  'js/app.js',
]

/**
 * Склеює класичні скрипти у 3 послідовні чанки (code splitting).
 * Кожен чанк — звичайний script (не type=module), тож let/function
 * лишаються в спільному глобальному лексичному середовищі.
 * Порядок завантаження = порядок CLASSIC_SCRIPTS. Без eval (CSP).
 */
function classicScriptsBundle(scriptPaths) {
  const groups = [
    { name: 'app-core', files: [] },
    { name: 'app-features', files: [] },
    { name: 'app-shell', files: [] },
  ]
  const featureFrom = scriptPaths.indexOf('js/features/settings.js')
  const shellFrom = scriptPaths.indexOf('js/views/registry.js')
  scriptPaths.forEach((p, i) => {
    const bucket = i < featureFrom ? 0 : i < shellFrom ? 1 : 2
    groups[bucket].files.push(resolve(__dirname, p))
  })
  const emitted = groups.map(g => `assets/${g.name}.js`)

  return {
    name: 'classic-scripts-bundle',
    apply: 'build',

    async generateBundle() {
      groups.forEach((group, idx) => {
        const parts = group.files.map(abs => {
          if (!existsSync(abs)) throw new Error(`[classic-scripts-bundle] Missing: ${abs}`)
          return `/* ${abs.replace(__dirname + '/', '')} */\n${readFileSync(abs, 'utf8')}`
        })
        const joined = parts.join('\n;\n')
        let source = joined
        try {
          const result = transformSync(joined, {
            minify: true,
            target: ['es2018'],
            legalComments: 'none',
          })
          source = result.code
        } catch (e) {
          console.warn(`[classic-scripts-bundle] minify failed for ${group.name}:`, e.message)
        }
        const ref = this.emitFile({
          type: 'asset',
          name: `${group.name}.js`,
          fileName: `assets/${group.name}.js`,
          source,
        })
        emitted[idx] = this.getFileName(ref) || emitted[idx]
      })
    },

    transformIndexHtml: {
      order: 'post',
      handler(html) {
        let out = html.replace(/<script\s+src="js\/[^"]+"\s*><\/script>\s*/g, '')
        const tags = emitted.map(name => `  <script src="./${name}"></script>`).join('\n') + '\n'
        if (!out.includes('assets/app-core.js')) {
          out = out.replace(/<\/body>/i, `${tags}</body>`)
        }
        return out
      },
    },
  }
}

/** Мінімальний ESM-entry, щоб @vitejs/plugin-legacy мав що обробляти */
function ensureLegacyEntry() {
  return {
    name: 'ensure-legacy-entry',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (html.includes('js/legacy-entry.js')) return html
        return html.replace(
          /<\/body>/i,
          '  <script type="module" src="/js/legacy-entry.js"></script>\n</body>'
        )
      },
    },
  }
}

export default defineConfig(({ mode }) => ({
  base: './',
  publicDir: false,

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: mode === 'development',
    cssCodeSplit: true,
    minify: 'esbuild',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('vite')) return 'vendor-vite'
            return 'vendor'
          }
        },
      },
    },
  },

  plugins: [
    ensureLegacyEntry(),
    classicScriptsBundle(CLASSIC_SCRIPTS),
    legacy({
      targets: [
        'defaults',
        'not IE 11',
        'Chrome >= 64',
        'Firefox >= 67',
        'Safari >= 12',
      ],
      modernPolyfills: true,
      renderLegacyChunks: true,
    }),
  ],

  server: {
    port: 5173,
    open: false,
  },

  preview: {
    port: 4173,
  },
}))
