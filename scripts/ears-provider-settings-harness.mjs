import { mkdir, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const providerRoute = '/settings/providers/transcription/app-local-audio-transcription'

function parseArgs(argv) {
  const args = {
    host: '127.0.0.1',
    port: 18767,
    smoke: false,
    keepAlive: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--host') {
      args.host = argv[++i]
    }
    else if (arg === '--port') {
      args.port = Number(argv[++i])
    }
    else if (arg === '--smoke') {
      args.smoke = true
    }
    else if (arg === '--keep-alive') {
      args.keepAlive = true
    }
    else if (arg === '--help' || arg === '-h') {
      args.help = true
    }
    else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

function printHelp() {
  console.log(`Usage: pnpm exec node scripts/ears-provider-settings-harness.mjs [options]

Options:
  --host <host>      Host to bind. Default: 127.0.0.1
  --port <port>      Port to bind. Default: 18767
  --smoke            Run a bounded Playwright smoke and exit.
  --keep-alive       Keep the dev-only harness server running.
  --help             Show this help.

This dev-only harness mounts the real app-local-audio-transcription Vue page
without starting stage-web, stage-tamagotchi, Electron, or asset download plugins.`)
}

function toViteFsPath(path) {
  return `/@fs/${path.replace(/\\/g, '/')}`
}

async function writeHarnessFiles(rootDir, repoRoot) {
  const srcDir = join(rootDir, 'src')
  await mkdir(srcDir, { recursive: true })

  const providerPage = toViteFsPath(resolve(repoRoot, 'packages/stage-pages/src/pages/settings/providers/transcription/app-local-audio-transcription.vue'))
  const stageUiProvidersDir = toViteFsPath(resolve(repoRoot, 'packages/stage-ui/src/components/scenarios/providers'))
  const stageUiMiscDir = toViteFsPath(resolve(repoRoot, 'packages/stage-ui/src/components/misc'))
  const uiFormDir = toViteFsPath(resolve(repoRoot, 'packages/ui/src/components/form/field'))
  const uiMiscDir = toViteFsPath(resolve(repoRoot, 'packages/ui/src/components/misc'))

  await writeFile(join(rootDir, 'index.html'), `<html>
  <head>
    <title>AIRI Ears Provider Settings Harness</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`, 'utf-8')

  await writeFile(join(srcDir, 'main.ts'), `import { MotionPlugin } from '@vueuse/motion'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { createRouter, createWebHistory } from 'vue-router'

import ProviderPage from '${providerPage}'

const messages = {
  en: {
    settings: {
      title: 'Settings',
      dialogs: {
        onboarding: {
          validationFailed: 'Validation failed',
          validationSuccess: 'Validation success',
          validationError: 'Validation error: {error}',
        },
      },
      pages: {
        providers: {
          common: {
            continueAnyway: 'Continue anyway',
            section: {
              basic: {
                title: 'Basic',
                description: 'Basic provider settings',
              },
              advanced: {
                title: 'Advanced',
              },
            },
          },
          provider: {
            'app-local-audio-transcription': {
              title: 'App Local Audio Transcription',
              description: 'Local app transcription provider',
            },
            transcriptions: {
              playground: {
                title: 'Transcription playground',
              },
            },
          },
        },
      },
    },
  },
}

const routes = [
  { path: '/', redirect: '${providerRoute}' },
  { path: '${providerRoute}', component: ProviderPage },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages,
})

createApp({
  template: '<main data-harness-root style="padding: 24px; min-height: 100vh;"><router-view /></main>',
})
  .use(createPinia())
  .use(router)
  .use(i18n)
  .use(MotionPlugin)
  .mount('#app')
`, 'utf-8')

  await writeFile(join(srcDir, 'stage-ui-components-shim.ts'), `export { default as Alert } from '${stageUiMiscDir}/alert.vue'
export { default as ProviderAdvancedSettings } from '${stageUiProvidersDir}/provider-advanced-settings.vue'
export { default as ProviderBaseUrlInput } from '${stageUiProvidersDir}/provider-base-url-input.vue'
export { default as ProviderBasicSettings } from '${stageUiProvidersDir}/provider-basic-settings.vue'
export { default as ProviderSettingsContainer } from '${stageUiProvidersDir}/provider-settings-container.vue'
export { default as ProviderSettingsLayout } from '${stageUiProvidersDir}/provider-settings-layout.vue'
export { default as TranscriptionPlayground } from '${stageUiProvidersDir}/transcription-playground.vue'
`, 'utf-8')

  await writeFile(join(srcDir, 'ui-shim.ts'), `export { default as Button } from '${uiMiscDir}/button.vue'
export { default as FieldCombobox } from '${uiFormDir}/field-combobox-select.vue'
export { default as FieldInput } from '${uiFormDir}/field-input.vue'
export { default as FieldRange } from '${uiFormDir}/field-range.vue'
`, 'utf-8')

  await writeFile(join(srcDir, 'build-time.ts'), `export default ${JSON.stringify(new Date(0).toISOString())}
`, 'utf-8')

  await writeFile(join(srcDir, 'build-git.ts'), `export const abbreviatedSha = 'ears-harness'
export const branch = 'codex/airi-ears-local-stt-provider'
`, 'utf-8')
}

function viteConfig(rootDir, repoRoot, vuePlugin, yamlPlugin, stageWebRequire, host, port) {
  return {
    root: rootDir,
    logLevel: 'warn',
    server: {
      host,
      port,
      strictPort: true,
      fs: {
        strict: false,
      },
    },
    define: {
      'import.meta.env.RUNTIME_ENVIRONMENT': JSON.stringify('electron'),
      'import.meta.env.URL_MODE': JSON.stringify('server'),
      'import.meta.env.VITE_APP_TARGET_HUGGINGFACE_SPACE': JSON.stringify('false'),
    },
    resolve: {
      alias: {
        '@vueuse/motion': stageWebRequire.resolve('@vueuse/motion'),
        'pinia': stageWebRequire.resolve('pinia'),
        'vue': stageWebRequire.resolve('vue'),
        'vue-i18n': stageWebRequire.resolve('vue-i18n'),
        'vue-router': stageWebRequire.resolve('vue-router'),
        '~build/time': resolve(rootDir, 'src/build-time.ts'),
        '~build/git': resolve(rootDir, 'src/build-git.ts'),
        '@proj-airi/stage-ui/components': resolve(rootDir, 'src/stage-ui-components-shim.ts'),
        '@proj-airi/ui': resolve(rootDir, 'src/ui-shim.ts'),
        '@proj-airi/audio': resolve(repoRoot, 'packages/audio/src'),
        '@proj-airi/ccc': resolve(repoRoot, 'packages/ccc/src'),
        '@proj-airi/core-agent': resolve(repoRoot, 'packages/core-agent/src'),
        '@proj-airi/core-character': resolve(repoRoot, 'packages/core-character/src'),
        '@proj-airi/i18n': resolve(repoRoot, 'packages/i18n/src'),
        '@proj-airi/model-driver-lipsync': resolve(repoRoot, 'packages/model-driver-lipsync/src'),
        '@proj-airi/pipelines-audio': resolve(repoRoot, 'packages/pipelines-audio/src'),
        '@proj-airi/server-sdk': resolve(repoRoot, 'packages/server-sdk/src'),
        '@proj-airi/server-sdk-shared': resolve(repoRoot, 'packages/server-sdk-shared/src'),
        '@proj-airi/stage-pages': resolve(repoRoot, 'packages/stage-pages/src'),
        '@proj-airi/stage-shared': resolve(repoRoot, 'packages/stage-shared/src'),
        '@proj-airi/stage-ui': resolve(repoRoot, 'packages/stage-ui/src'),
        '@proj-airi/stage-ui-live2d': resolve(repoRoot, 'packages/stage-ui-live2d/src'),
        '@proj-airi/stage-ui-spine': resolve(repoRoot, 'packages/stage-ui-spine/src'),
        '@proj-airi/stage-ui-three': resolve(repoRoot, 'packages/stage-ui-three/src'),
        '@proj-airi/stream-kit': resolve(repoRoot, 'packages/stream-kit/src'),
        '@proj-airi/ui': resolve(repoRoot, 'packages/ui/src'),
        '@proj-airi/ui-transitions': resolve(repoRoot, 'packages/ui-transitions/src'),
      },
    },
    plugins: [
      yamlPlugin(),
      vuePlugin(),
    ],
  }
}

async function runSmoke(url, chromium) {
  const launchAttempts = [
    { headless: true },
    { headless: true, channel: 'msedge' },
    { headless: true, channel: 'chrome' },
  ]
  let browser
  const launchErrors = []
  for (const options of launchAttempts) {
    try {
      browser = await chromium.launch(options)
      break
    }
    catch (error) {
      launchErrors.push(`${JSON.stringify(options)}: ${error.message}`)
    }
  }
  if (!browser)
    throw new Error(`Unable to launch Playwright browser without downloads:\n${launchErrors.join('\n')}`)

  try {
    const page = await browser.newPage()
    const messages = []
    page.on('console', (message) => {
      if (message.type() === 'error')
        messages.push(message.text())
    })
    page.on('pageerror', error => messages.push(error.message))

    await page.goto(`${url}${providerRoute}`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-harness-root]', { timeout: 15_000 })
    await page.waitForSelector('input[placeholder="auto"]', { timeout: 15_000 })
    await page.getByRole('button', { name: /Advanced/i }).click()
    await page.waitForSelector('input[placeholder="http://127.0.0.1:18765/v1"]', { timeout: 15_000 })

    const result = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(input => ({
        placeholder: input.getAttribute('placeholder') || '',
        value: input.value,
        required: input.required,
      }))
      return {
        titleText: document.body.innerText.includes('App Local Audio Transcription'),
        modelInput: inputs.find(input => input.placeholder === 'auto'),
        baseUrlInput: inputs.find(input => input.placeholder === 'http://127.0.0.1:18765/v1'),
        playgroundTextPresent: document.body.innerText.includes('Transcription playground'),
        startMonitoringPresent: document.body.innerText.includes('Start Monitoring'),
        inputCount: inputs.length,
      }
    })

    return {
      ok: result.modelInput?.value === 'auto'
        && result.baseUrlInput?.value === 'http://127.0.0.1:18765/v1'
        && result.baseUrlInput?.required === true
        && result.playgroundTextPresent === true
        && result.startMonitoringPresent === true,
      route: providerRoute,
      ...result,
      consoleErrors: messages,
    }
  }
  finally {
    await browser.close()
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
  const stageWebRequire = createRequire(resolve(repoRoot, 'apps/stage-web/package.json'))
  const vishotRequire = createRequire(resolve(repoRoot, 'packages/vishot-runner-browser/package.json'))
  const { default: Vue } = await import(pathToFileURL(stageWebRequire.resolve('@vitejs/plugin-vue')).href)
  const { default: Yaml } = await import(pathToFileURL(stageWebRequire.resolve('unplugin-yaml/vite')).href)
  const { createServer } = await import(pathToFileURL(stageWebRequire.resolve('vite')).href)
  const playwright = await import(pathToFileURL(vishotRequire.resolve('playwright')).href)
  const chromium = playwright.chromium ?? playwright.default?.chromium
  if (!chromium)
    throw new Error('Unable to resolve Playwright chromium export')
  const rootDir = resolve(repoRoot, '.cache/ears-provider-settings-harness')
  await rm(rootDir, { recursive: true, force: true })
  await writeHarnessFiles(rootDir, repoRoot)

  const server = await createServer(viteConfig(rootDir, repoRoot, Vue, Yaml, stageWebRequire, args.host, args.port))
  await server.listen()
  const url = server.resolvedUrls?.local?.[0]?.replace(/\/$/, '') ?? `http://${args.host}:${args.port}`
  console.log(`AIRI Ears provider settings harness listening at ${url}${providerRoute}`)

  try {
    if (args.smoke) {
      const result = await runSmoke(url, chromium)
      console.log(JSON.stringify(result, null, 2))
      if (!result.ok)
        process.exitCode = 2
      return
    }

    if (args.keepAlive) {
      await new Promise(() => {})
      return
    }
  }
  finally {
    await server.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
