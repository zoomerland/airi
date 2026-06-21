<script setup lang="ts">
import type { SpeechProvider } from '@xsai-ext/providers/utils'

import {
  Alert,
  SpeechPlaygroundOpenAICompatible,
  SpeechProviderSettings,
} from '@proj-airi/stage-ui/components'
import { useProviderValidation } from '@proj-airi/stage-ui/composables/use-provider-validation'
import { useSpeechStore } from '@proj-airi/stage-ui/stores/modules/speech'
import { useProvidersStore } from '@proj-airi/stage-ui/stores/providers'
import { FieldInput } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const speechStore = useSpeechStore()
const providersStore = useProvidersStore()
const { providers } = storeToRefs(providersStore)
const { t } = useI18n()

const providerId = 'app-local-audio-speech'
const defaultModel = 'piper-ru_RU-irina-medium'
const defaultVoice = 'ru_RU-irina-medium'
const defaultBaseUrl = 'http://127.0.0.1:8766/v1/'

const model = computed({
  get: () => {
    const raw = providers.value[providerId]?.model as string | undefined | null
    return raw ?? defaultModel
  },
  set: (value) => {
    providers.value[providerId] ??= {}
    providers.value[providerId].model = value
  },
})

const voice = computed({
  get: () => {
    const raw = providers.value[providerId]?.voice as string | undefined | null
    return raw ?? defaultVoice
  },
  set: (value) => {
    providers.value[providerId] ??= {}
    providers.value[providerId].voice = value
  },
})

watch(
  () => providers.value[providerId],
  (config) => {
    if (!config)
      return
    config.apiKey ??= ''
    config.baseUrl ??= defaultBaseUrl
    config.model ??= defaultModel
    config.voice ??= defaultVoice
  },
  { deep: true, immediate: true },
)

onMounted(() => {
  providers.value[providerId] ??= {}
  providers.value[providerId].apiKey ??= ''
  providers.value[providerId].baseUrl ??= defaultBaseUrl
  providers.value[providerId].model ??= defaultModel
  providers.value[providerId].voice ??= defaultVoice
})

async function handleGenerateSpeech(input: string, voiceId: string, _useSSML: boolean, modelId?: string) {
  const provider = await providersStore.getProviderInstance<SpeechProvider<string>>(providerId)
  if (!provider)
    throw new Error('Failed to initialize local speech provider')

  const providerConfig = providersStore.getProviderConfig(providerId)
  const modelToUse = modelId || model.value || defaultModel
  const voiceToUse = voiceId || voice.value || defaultVoice

  return await speechStore.speech(
    provider,
    modelToUse,
    input,
    voiceToUse,
    {
      ...providerConfig,
      apiKey: '',
      model: modelToUse,
      voice: voiceToUse,
    },
  )
}

const {
  isValidating,
  isValid,
  validationMessage,
  forceValid,
} = useProviderValidation(providerId)
</script>

<template>
  <SpeechProviderSettings
    :provider-id="providerId"
    :default-model="defaultModel"
    placeholder="Not required for local TTS"
  >
    <template #voice-settings>
      <FieldInput
        v-model="model"
        label="Model"
        description="Local Piper TTS model served by the Mouth service"
        :placeholder="defaultModel"
      />
      <FieldInput
        v-model="voice"
        label="Voice"
        description="Local Piper voice served by the Mouth service"
        :placeholder="defaultVoice"
      />
    </template>

    <template #playground>
      <SpeechPlaygroundOpenAICompatible
        v-model:model-value="model"
        v-model:voice="voice as any"
        :generate-speech="handleGenerateSpeech"
        :api-key-configured="true"
        default-text="Привет! Я локальная AIRI."
      />
    </template>

    <template #advanced-settings>
      <Alert v-if="!isValid && isValidating === 0 && validationMessage" type="error">
        <template #title>
          <div class="w-full flex items-center justify-between">
            <span>{{ t('settings.dialogs.onboarding.validationFailed') }}</span>
            <button
              type="button"
              class="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-600 font-medium transition-colors dark:bg-red-800/30 hover:bg-red-200 dark:text-red-300 dark:hover:bg-red-700/40"
              @click="forceValid"
            >
              {{ t('settings.pages.providers.common.continueAnyway') }}
            </button>
          </div>
        </template>
        <template v-if="validationMessage" #content>
          <div class="whitespace-pre-wrap break-all">
            {{ validationMessage }}
          </div>
        </template>
      </Alert>
      <Alert v-if="isValid && isValidating === 0" type="success">
        <template #title>
          {{ t('settings.dialogs.onboarding.validationSuccess') }}
        </template>
      </Alert>
    </template>
  </SpeechProviderSettings>
</template>

<route lang="yaml">
meta:
  layout: settings
  stageTransition:
    name: slide
</route>
