import { describe, expect, it } from 'vitest'

import { resolveLocalBrainSpeechOutputContract } from './speech-output-contract'

describe('resolveLocalBrainSpeechOutputContract', () => {
  it('is disabled by default for Ollama', () => {
    expect(resolveLocalBrainSpeechOutputContract({
      providerId: 'ollama',
      providerConfig: {},
    })).toBeUndefined()
  })

  it('is disabled when Ollama opt-in is false', () => {
    expect(resolveLocalBrainSpeechOutputContract({
      providerId: 'ollama',
      providerConfig: {
        speechOutputContract: {
          enabled: false,
        },
      },
    })).toBeUndefined()
  })

  it('enables the default contract for explicit Ollama opt-in', () => {
    expect(resolveLocalBrainSpeechOutputContract({
      providerId: 'ollama',
      providerConfig: {
        speechOutputContract: {
          enabled: true,
        },
      },
    })).toEqual({
      enabled: true,
      maxWords: 16,
    })
  })

  it('accepts a bounded custom maxWords value for Ollama', () => {
    expect(resolveLocalBrainSpeechOutputContract({
      providerId: 'ollama',
      providerConfig: {
        speechOutputContract: {
          enabled: true,
          maxWords: 24,
        },
      },
    })).toEqual({
      enabled: true,
      maxWords: 24,
    })
  })

  it('falls back to the default when maxWords is invalid', () => {
    expect(resolveLocalBrainSpeechOutputContract({
      providerId: 'ollama',
      providerConfig: {
        speechOutputContract: {
          enabled: true,
          maxWords: 0,
        },
      },
    })).toEqual({
      enabled: true,
      maxWords: 16,
    })
  })

  it('stays disabled for non-Ollama providers even with matching config', () => {
    expect(resolveLocalBrainSpeechOutputContract({
      providerId: 'lm-studio',
      providerConfig: {
        speechOutputContract: {
          enabled: true,
        },
      },
    })).toBeUndefined()
  })
})
