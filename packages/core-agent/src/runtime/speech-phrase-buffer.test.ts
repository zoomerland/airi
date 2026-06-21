import { describe, expect, it } from 'vitest'

import { createSpeechPhraseBuffer } from './speech-phrase-buffer'

describe('createSpeechPhraseBuffer', () => {
  it('holds split chunks until punctuation completes a phrase', () => {
    const buffer = createSpeechPhraseBuffer()

    expect(buffer.append('Давай сегодня')).toEqual([])
    expect(buffer.append(' без сложных задач.')).toEqual(['Давай сегодня без сложных задач.'])
  })

  it('returns multiple completed phrases from one chunk', () => {
    const buffer = createSpeechPhraseBuffer()

    expect(buffer.append('Привет. Я рядом!')).toEqual(['Привет.', ' Я рядом!'])
  })

  it('flushes final incomplete phrase at stream end', () => {
    const buffer = createSpeechPhraseBuffer()

    expect(buffer.append('Привет, я рядом')).toEqual([])
    expect(buffer.flush()).toBe('Привет, я рядом')
    expect(buffer.flush()).toBeUndefined()
  })

  it('clears pending text without emitting it', () => {
    const buffer = createSpeechPhraseBuffer()

    expect(buffer.append('Привет,')).toEqual([])
    buffer.clear()
    expect(buffer.flush()).toBeUndefined()
  })
})
