export type SpeechOutputContractFailReason =
  | 'empty_output'
  | 'contains_cjk'
  | 'contains_latin'
  | 'contains_emoji'
  | 'contains_markdown'
  | 'contains_control_tag'
  | 'contains_json_or_toolish'
  | 'contains_emotion_or_stage_direction'
  | 'overlong_output'
  | 'missing_cyrillic'

export interface SpeechOutputContract {
  /**
   * Enables the contract for one runtime send.
   *
   * @default false
   */
  enabled: boolean
  /**
   * Maximum words allowed in one Mouth-facing phrase.
   *
   * @default 16
   */
  maxWords?: number
}

export interface SpeechOutputValidationResult {
  ok: boolean
  failReasons: SpeechOutputContractFailReason[]
  wordCount: number
  charCount: number
  maxWords: number
}

const DEFAULT_MAX_WORDS = 16

const CJK_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/
const CYRILLIC_RE = /[\u0400-\u04FF]/
const LATIN_RE = /[A-Za-z]/
const EMOJI_RE = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u
const CONTROL_TAG_RE = /<\/?[^>\s]+(?:\s+[^>]*)?>/
const MARKDOWN_RE = /(^|\n)\s*(?:[-*+]\s+|\d+\.\s+|#{1,6}\s+|>\s+)|```|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\[[^\]]+\]\([^)]+\)|\|/
const JSON_TOOL_RE = /^\s*[\[{][\s\S]*[\]}]\s*$|"(?:tool|function|arguments|role|assistant|system|user|content|json)"\s*:|\b(?:tool|function|json|assistant|system|user|arguments|role)\b/im
const STAGE_DIRECTION_RE = /^\s*(?:\([^)]{1,80}\)|\[[^\]]{1,80}\]|\*[^*]{1,80}\*|(?:emotion|style|action|stage direction)\s*:)/i

/**
 * Validates text against the local Russian Brain-to-Mouth speech contract.
 *
 * The validator is intentionally conservative: a failing phrase should be
 * withheld from Mouth-facing hooks instead of silently sanitized and spoken.
 */
export function validateSpeechOutput(text: string, contract: SpeechOutputContract = { enabled: true }): SpeechOutputValidationResult {
  const maxWords = contract.maxWords ?? DEFAULT_MAX_WORDS
  const trimmed = text.trim()
  const failReasons: SpeechOutputContractFailReason[] = []
  const wordCount = countWords(trimmed)

  if (!trimmed)
    failReasons.push('empty_output')
  if (CJK_RE.test(trimmed))
    failReasons.push('contains_cjk')
  if (LATIN_RE.test(trimmed))
    failReasons.push('contains_latin')
  if (EMOJI_RE.test(trimmed))
    failReasons.push('contains_emoji')
  if (MARKDOWN_RE.test(trimmed))
    failReasons.push('contains_markdown')
  if (CONTROL_TAG_RE.test(trimmed))
    failReasons.push('contains_control_tag')
  if (JSON_TOOL_RE.test(trimmed))
    failReasons.push('contains_json_or_toolish')
  if (STAGE_DIRECTION_RE.test(trimmed))
    failReasons.push('contains_emotion_or_stage_direction')
  if (wordCount > maxWords)
    failReasons.push('overlong_output')
  if (trimmed && !CYRILLIC_RE.test(trimmed))
    failReasons.push('missing_cyrillic')

  return {
    ok: failReasons.length === 0,
    failReasons,
    wordCount,
    charCount: trimmed.length,
    maxWords,
  }
}

function countWords(text: string): number {
  return text.match(/[\w\u0400-\u04FF]+/gu)?.length ?? 0
}
