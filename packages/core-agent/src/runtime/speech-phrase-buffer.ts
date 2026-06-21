export interface SpeechPhraseBuffer {
  append: (text: string) => string[]
  flush: () => string | undefined
  clear: () => void
}
const PHRASE_END_RE = /[.!?\n\u2026\u3002]/

/**
 * Buffers streamed speech text until phrase boundaries are complete enough for
 * Mouth-safety validation.
 */
export function createSpeechPhraseBuffer(): SpeechPhraseBuffer {
  let pending = ''

  return {
    append(text: string) {
      pending += text

      const phrases: string[] = []
      let boundaryIndex = findBoundaryIndex(pending)
      while (boundaryIndex >= 0) {
        const phrase = pending.slice(0, boundaryIndex + 1)
        pending = pending.slice(boundaryIndex + 1)
        if (phrase.trim())
          phrases.push(phrase)
        boundaryIndex = findBoundaryIndex(pending)
      }

      return phrases
    },
    flush() {
      const phrase = pending
      pending = ''
      return phrase.trim() ? phrase : undefined
    },
    clear() {
      pending = ''
    },
  }
}

function findBoundaryIndex(text: string): number {
  for (let index = 0; index < text.length; index++) {
    if (PHRASE_END_RE.test(text[index]))
      return index
  }

  return -1
}
