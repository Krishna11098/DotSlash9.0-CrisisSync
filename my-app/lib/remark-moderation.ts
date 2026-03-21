export const ABUSIVE_TERMS = [
  'abuse',
  'abusive',
  'stupid',
  'idiot',
  'moron',
  'dumb',
  'useless',
  'shut up',
  'bloody',
  'nonsense',
  'bakwas',
  'bewakoof',
  'chutiya',
  'harami',
  'gandu',
  'saala',
  'madarchod',
  'bhenchod',
  'randi',
  'kutta',
]

export type RemarkModerationResult = {
  isDerogatory: boolean
  matchedTerms: string[]
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeRemark = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const moderateRemarkWithWordList = (remark: string): RemarkModerationResult => {
  const normalizedText = normalizeRemark(remark)

  if (!normalizedText) {
    return {
      isDerogatory: false,
      matchedTerms: [],
    }
  }

  const matchedTerms = ABUSIVE_TERMS.filter((term) => {
    const normalizedTerm = normalizeRemark(term)
    if (!normalizedTerm) return false

    const pattern = new RegExp(`(?:^|\\s)${escapeRegex(normalizedTerm)}(?:$|\\s)`, 'i')
    return pattern.test(normalizedText)
  })

  return {
    isDerogatory: matchedTerms.length > 0,
    matchedTerms,
  }
}
