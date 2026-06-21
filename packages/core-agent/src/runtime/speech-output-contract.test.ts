import { describe, expect, it } from 'vitest'

import { validateSpeechOutput } from './speech-output-contract'

describe('validateSpeechOutput', () => {
  it('passes short Russian speech text', () => {
    const result = validateSpeechOutput('Давай сегодня без сложных задач.')

    expect(result.ok).toBe(true)
    expect(result.failReasons).toEqual([])
    expect(result.wordCount).toBe(5)
  })

  it('flags empty output', () => {
    const result = validateSpeechOutput('   ')

    expect(result.ok).toBe(false)
    expect(result.failReasons).toContain('empty_output')
  })

  it('flags CJK leakage', () => {
    const result = validateSpeechOutput('Хорошо, 今天 без сложных задач.')

    expect(result.ok).toBe(false)
    expect(result.failReasons).toContain('contains_cjk')
  })

  it('flags Latin leakage', () => {
    const result = validateSpeechOutput('Hello, я рядом.')

    expect(result.ok).toBe(false)
    expect(result.failReasons).toContain('contains_latin')
  })

  it('flags emoji', () => {
    const result = validateSpeechOutput('Привет, я рядом 😊')

    expect(result.ok).toBe(false)
    expect(result.failReasons).toContain('contains_emoji')
  })

  it('flags markdown markers', () => {
    const result = validateSpeechOutput('- Давай начнем спокойно.')

    expect(result.ok).toBe(false)
    expect(result.failReasons).toContain('contains_markdown')
  })

  it('flags control tags', () => {
    const result = validateSpeechOutput('<think>секрет</think> Давай начнем.')

    expect(result.ok).toBe(false)
    expect(result.failReasons).toContain('contains_control_tag')
  })

  it('flags JSON and tool-ish text', () => {
    const result = validateSpeechOutput('{"tool": "speak", "text": "Привет"}')

    expect(result.ok).toBe(false)
    expect(result.failReasons).toContain('contains_json_or_toolish')
  })

  it('flags emotion labels and stage directions', () => {
    const result = validateSpeechOutput('(улыбается) Привет, я рядом.')

    expect(result.ok).toBe(false)
    expect(result.failReasons).toContain('contains_emotion_or_stage_direction')
  })

  it('flags overlong speech text', () => {
    const result = validateSpeechOutput('Давай сегодня спокойно разберем план, потом выберем одно простое действие и вернемся к остальному без спешки и лишнего напряжения.')

    expect(result.ok).toBe(false)
    expect(result.failReasons).toContain('overlong_output')
  })
})
