import type { SpeechOutputContract } from '@proj-airi/core-agent'

const LOCAL_BRAIN_SPEECH_OUTPUT_PROVIDER_IDS = new Set(['ollama'])
const DEFAULT_MAX_WORDS = 16

export interface LocalBrainSpeechOutputContractOptions {
  providerId?: string | null
  providerConfig?: Record<string, unknown> | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function resolveMaxWords(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value))
    return undefined

  const normalized = Math.trunc(value)
  if (normalized < 1 || normalized > 80)
    return undefined

  return normalized
}

/**
 * Resolves the optional local Brain speech contract for the Stage runtime.
 *
 * This stays deliberately explicit: local transport alone is not enough to
 * make every model output safe for Mouth.
 */
export function resolveLocalBrainSpeechOutputContract(
  options: LocalBrainSpeechOutputContractOptions,
): SpeechOutputContract | undefined {
  if (!options.providerId || !LOCAL_BRAIN_SPEECH_OUTPUT_PROVIDER_IDS.has(options.providerId))
    return undefined

  const contractConfig = options.providerConfig?.speechOutputContract
  if (!isRecord(contractConfig) || contractConfig.enabled !== true)
    return undefined

  return {
    enabled: true,
    maxWords: resolveMaxWords(contractConfig.maxWords) ?? DEFAULT_MAX_WORDS,
  }
}
