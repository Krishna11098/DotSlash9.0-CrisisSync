export const PHONE_PATTERNS = [
    String.raw`\+91[\s-]?[6-9]\d{4}[\s-]?\d{5}`,
    String.raw`0091[\s-]?[6-9]\d{4}[\s-]?\d{5}`,
    String.raw`91[\s-]?[6-9]\d{9}`,
    String.raw`0[6-9]\d{9}`,
    String.raw`[6-9]\d{9}`,
]

export const EMAIL_PATTERNS = [
    String.raw`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`,
    String.raw`[\w\.-]+@[\w\.-]+\.\w{2,}`,
    String.raw`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`,
    String.raw`<[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}>`,
]

const normalizeDigits = (value: string) => value.replace(/\D/g, '')
const isIndianMobile10 = (digits: string) => /^[6-9]\d{9}$/.test(digits)

export const normalizeEmailAddress = (email: string) => {
    const trimmedEmail = email.trim().replace(/^<|>$/g, '')
    return trimmedEmail.toLowerCase()
}

export const normalizePhoneNumber = (phone: string) => {
    const trimmed = phone.trim()
    if (!trimmed) return ''

    if (!/^[\d\s()+-]+$/.test(trimmed)) return ''

    const digits = normalizeDigits(trimmed)
    if (!digits) return ''

    if (digits.startsWith('0091') && digits.length === 14) {
        const local = digits.slice(4)
        return isIndianMobile10(local) ? local : ''
    }

    if (digits.startsWith('91') && digits.length === 12) {
        const local = digits.slice(2)
        return isIndianMobile10(local) ? local : ''
    }

    if (digits.startsWith('0') && digits.length === 11) {
        const local = digits.slice(1)
        return isIndianMobile10(local) ? local : ''
    }

    if (digits.length === 10 && isIndianMobile10(digits)) {
        return digits
    }

    return ''
}

const toFullMatchRegex = (pattern: string) => {
    const isAnchored = pattern.startsWith('^') && pattern.endsWith('$')
    const safePattern = isAnchored ? pattern : `^(?:${pattern})$`
    return new RegExp(safePattern)
}

const matchesAny = (value: string, patterns: string[]) => {
    const trimmedValue = value.trim()
    return patterns.some((pattern) => toFullMatchRegex(pattern).test(trimmedValue))
}

export const isValidPhone = (phone: string) => {
    if (matchesAny(phone, PHONE_PATTERNS)) return true
    return normalizePhoneNumber(phone) !== ''
}

export const isValidEmail = (email: string) => {
    const trimmedEmail = email.trim()
    const normalized = normalizeEmailAddress(trimmedEmail)
    return matchesAny(trimmedEmail, EMAIL_PATTERNS) || matchesAny(normalized, EMAIL_PATTERNS)
}

export const validateMaxLength = (label: string, value: string, maxLength: number) => {
    if (value.trim().length > maxLength) {
        return `${label} must be ${maxLength} characters or fewer`
    }
    return ''
}

export const validateRequiredText = (label: string, value: string, minLength = 2) => {
    const trimmed = value.trim()
    if (!trimmed) {
        return `${label} is required`
    }
    if (trimmed.length < minLength) {
        return `${label} must be at least ${minLength} characters`
    }
    return ''
}
