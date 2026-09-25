import { describe, expect, it } from 'vitest'

import { truncate, wrapText } from './text'

describe('truncate', () => {
  it('leaves short text alone', () => {
    expect(truncate('Dallas, TX', 20)).toBe('Dallas, TX')
  })

  it('adds an ellipsis within the limit', () => {
    expect(truncate('Oklahoma City, OK', 10)).toBe('Oklahoma…')
  })
})

describe('wrapText', () => {
  it('wraps on word boundaries', () => {
    expect(wrapText('Tractor 1042 / Trailer 5531', 14, 3)).toEqual([
      'Tractor 1042 /',
      'Trailer 5531',
    ])
  })

  it('truncates what does not fit in the last line', () => {
    expect(wrapText('one two three four five six', 9, 2)).toEqual(['one two', 'three fo…'])
  })

  it('returns no lines for blank text', () => {
    expect(wrapText('  ', 10, 2)).toEqual([])
  })
})
