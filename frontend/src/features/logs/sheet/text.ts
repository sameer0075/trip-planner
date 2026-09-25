export function truncate(text: string, maxChars: number): string {
  return text.length <= maxChars ? text : `${text.slice(0, maxChars - 1).trimEnd()}…`
}

/** Greedy word wrap into at most `maxLines` lines; the last line is truncated if needed. */
export function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const lines: string[] = []
  let current = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxChars || !current) {
      current = candidate
      continue
    }
    lines.push(current)
    current = word
  }
  if (current) lines.push(current)

  if (lines.length <= maxLines) return lines.map((line) => truncate(line, maxChars))
  const kept = lines.slice(0, maxLines)
  kept[maxLines - 1] = truncate(lines.slice(maxLines - 1).join(' '), maxChars)
  return kept
}
