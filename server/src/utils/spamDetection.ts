/**
 * Spam detection utilities
 */

// Blacklisted keywords (case-insensitive)
const SPAM_KEYWORDS = [
  'campuchia',
  'cambodia',
  'lừa đảo',
  'scam',
  'chuyển tiền',
  'western union',
  'moneygram',
  'đầu tư',
  'kiếm tiền online',
  'MLM',
  'đa cấp',
  'bán thận',
  'hiến thận',
  'việc nhẹ lương cao',
  'không cần kinh nghiệm',
  'bitcoin',
  'forex',
];

// Suspicious phone patterns
const SUSPICIOUS_PHONE_PATTERNS = [
  /^\+855/, // Cambodia country code
  /^\+84\s*0/, // Invalid Vietnam format
  /^84\s*0/, // Invalid format
];

interface SpamCheckResult {
  isSpam: boolean;
  reason?: string;
  score: number; // 0-100, higher = more spam-like
}

/**
 * Check if text contains spam keywords
 */
export const containsSpamKeywords = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return SPAM_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

/**
 * Check if phone number is suspicious
 */
export const isSuspiciousPhone = (phone: string): boolean => {
  if (!phone) return false;
  return SUSPICIOUS_PHONE_PATTERNS.some(pattern => pattern.test(phone));
};

/**
 * Comprehensive spam check
 */
export const checkForSpam = (data: {
  title: string;
  description: string;
  contactInfo?: {
    phone?: string;
    email?: string;
  };
}): SpamCheckResult => {
  let score = 0;
  const reasons: string[] = [];

  // Check title
  if (containsSpamKeywords(data.title)) {
    score += 50;
    reasons.push('Spam keywords in title');
  }

  // Check description
  if (containsSpamKeywords(data.description)) {
    score += 40;
    reasons.push('Spam keywords in description');
  }

  // Check phone
  if (data.contactInfo?.phone && isSuspiciousPhone(data.contactInfo.phone)) {
    score += 30;
    reasons.push('Suspicious phone number');
  }

  // Check for excessive caps
  const capsRatio = (data.description.match(/[A-Z]/g) || []).length / data.description.length;
  if (capsRatio > 0.5 && data.description.length > 20) {
    score += 20;
    reasons.push('Excessive capital letters');
  }

  // Check for too many emojis
  const emojiCount = (data.description.match(/[\u{1F600}-\u{1F64F}]/gu) || []).length;
  if (emojiCount > 10) {
    score += 15;
    reasons.push('Too many emojis');
  }

  // Check for URLs in description (often affiliate links)
  const urlPattern = /https?:\/\/[^\s]+/g;
  const urls = data.description.match(urlPattern) || [];
  if (urls.length > 2) {
    score += 25;
    reasons.push('Multiple URLs detected');
  }

  // Check for shortener services
  const shorteners = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co'];
  if (shorteners.some(s => data.description.includes(s))) {
    score += 30;
    reasons.push('URL shortener detected');
  }

  return {
    isSpam: score >= 50, // Threshold: 50+
    reason: reasons.join(', '),
    score,
  };
};

/**
 * Extract metadata from request for tracking
 */
export const extractMetadata = (req: any) => {
  return {
    ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    timestamp: new Date().toISOString(),
    country: req.headers['cf-ipcountry'] || null, // Cloudflare header
  };
};
