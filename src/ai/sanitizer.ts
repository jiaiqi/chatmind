export interface SanitizeOptions {
  truncateLength?: number
  maskNames?: boolean
  maskNumbers?: boolean
  maskLocations?: boolean
}

const RULES = {
  phone: { pattern: /\b1[3-9]\d{9}\b/g, replacement: '[手机号]' },
  wxid: { pattern: /wxid_[a-zA-Z0-9_-]+/gi, replacement: '[微信ID]' },
  idCard: { pattern: /\b\d{17}[\dXx]\b/g, replacement: '[身份证]' },
  bankCard: { pattern: /\b\d{16,19}\b/g, replacement: '[银行卡]' },
  email: { pattern: /[\w.-]+@[\w.-]+\.\w+/g, replacement: '[邮箱]' },
  address: { pattern: /.{2,4}省.{2,4}市.{2,4}[区县].{3,20}[路街道号]/g, replacement: '[地址]' },
}

export function sanitizeText(text: string, options: SanitizeOptions = {}): string {
  const { truncateLength = 200, maskNumbers = true, maskLocations = true } = options

  let result = text

  if (maskNumbers) {
    result = result
      .replace(RULES.phone.pattern, RULES.phone.replacement)
      .replace(RULES.idCard.pattern, RULES.idCard.replacement)
      .replace(RULES.bankCard.pattern, RULES.bankCard.replacement)
      .replace(RULES.wxid.pattern, RULES.wxid.replacement)
      .replace(RULES.email.pattern, RULES.email.replacement)
  }

  if (maskLocations) {
    result = result.replace(RULES.address.pattern, RULES.address.replacement)
  }

  if (truncateLength > 0 && result.length > truncateLength) {
    result = result.slice(0, truncateLength) + '...'
  }

  return result
}

export function sanitizeMessages(
  messages: { content: string; isSelf: boolean; senderName?: string }[],
  options?: SanitizeOptions,
): { content: string; senderLabel: string }[] {
  return messages.map(m => ({
    content: sanitizeText(m.content, options),
    senderLabel: m.isSelf ? '用户A' : '用户B',
  }))
}
