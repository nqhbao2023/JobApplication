/**
 * Hybrid AI Categorizer Service
 * 
 * 2-layer categorization system:
 * 1. Regex patterns with confidence scoring (fast, handles ~80% of jobs)
 * 2. Gemini AI batch processing for low-confidence cases (~20%)
 * 
 * Usage:
 *   import { hybridCategorize, getCategorizationStats } from './ai-categorizer';
 *   const result = await hybridCategorize(jobs);
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// ============ TYPES ============
export interface JobForCategorization {
  title: string;
  description: string;
  company_name?: string;
  [key: string]: any;
}

export interface CategorizedJob extends JobForCategorization {
  jobCategories: string;
  categoryConfidence: number;
  categoryMethod: 'regex' | 'ai';
}

export interface CategorizationStats {
  total: number;
  regexHandled: number;
  aiHandled: number;
  avgRegexConfidence: number;
  avgAiConfidence: number;
  categoryDistribution: Record<string, number>;
  processingTimeMs: number;
}

// ============ CONSTANTS ============
const CONFIDENCE_THRESHOLD = 90; // Higher threshold = more AI usage (regex must be very confident)
const AI_BATCH_SIZE = 5; // Jobs per AI request
const AI_TIMEOUT = 30000; // 30 seconds

// Valid categories list
const VALID_CATEGORIES = [
  'it-software',
  'marketing',
  'sales',
  'design',
  'finance',
  'hr',
  'engineering',
  'healthcare',
  'education',
  'f&b',
  'retail',
  'logistics',
  'construction',
  'manufacturing',
  'other'
] as const;

type CategoryType = typeof VALID_CATEGORIES[number];

// ============ REGEX PATTERNS WITH WEIGHTS ============
interface PatternConfig {
  patterns: RegExp[];
  weight: number; // Base confidence when matched
}

const CATEGORY_PATTERNS: Record<CategoryType, PatternConfig> = {
  'it-software': {
    patterns: [
      /\b(developer|lập trình|software|backend|frontend|fullstack|devops|sre)\b/i,
      /\b(react|angular|vue|node\.?js|python|java|c\+\+|c#|php|ruby|golang|rust)\b/i,
      /\b(mobile app|android|ios|flutter|react native|swift|kotlin)\b/i,
      /\b(data engineer|data scientist|machine learning|ml|ai|deep learning)\b/i,
      /\b(cloud|aws|azure|gcp|docker|kubernetes|k8s)\b/i,
      /\b(qa|tester|testing|automation test|selenium)\b/i,
      /\b(database|sql|mysql|postgresql|mongodb|redis|firebase)\b/i,
      /\b(api|rest|graphql|microservice|architecture)\b/i,
      /\b(it support|system admin|network admin|helpdesk)\b/i,
      /\b(security|bảo mật|cyber|penetration)\b/i,
      /\b(scrum master|product owner|tech lead|cto)\b/i,
    ],
    weight: 85
  },
  'marketing': {
    patterns: [
      /\b(marketing|tiếp thị|digital marketing|online marketing)\b/i,
      /\b(seo|sem|google ads|facebook ads|tiktok ads)\b/i,
      /\b(content|copywriter|biên tập|editor)\b/i,
      /\b(social media|mạng xã hội|fanpage|community)\b/i,
      /\b(brand|thương hiệu|branding|pr|public relation)\b/i,
      /\b(email marketing|crm marketing|automation marketing)\b/i,
      /\b(influencer|kol|affiliate|performance)\b/i,
      /\b(market research|nghiên cứu thị trường)\b/i,
    ],
    weight: 80
  },
  'sales': {
    patterns: [
      /\b(sales|bán hàng|kinh doanh|business development)\b/i,
      /\b(account manager|account executive|ae|am)\b/i,
      /\b(telesales|inside sales|field sales|direct sales)\b/i,
      /\b(b2b|b2c|enterprise sales|solution sales)\b/i,
      /\b(nhân viên tư vấn|consultant|tư vấn bán hàng)\b/i,
      /\b(key account|customer success|client service)\b/i,
      /\b(sales manager|trưởng phòng kinh doanh)\b/i,
      /\b(revenue|doanh số|target|chỉ tiêu)\b/i,
    ],
    weight: 75
  },
  'design': {
    patterns: [
      /\b(designer|thiết kế|ui\/ux|ui|ux|graphic)\b/i,
      /\b(photoshop|illustrator|figma|sketch|adobe|canva)\b/i,
      /\b(creative|sáng tạo|art director|creative director)\b/i,
      /\b(motion graphic|video editor|animator|3d)\b/i,
      /\b(interior|nội thất|architect|kiến trúc)\b/i,
      /\b(fashion design|thiết kế thời trang|apparel)\b/i,
      /\b(product design|industrial design)\b/i,
      /\b(visual|branding design|identity)\b/i,
    ],
    weight: 80
  },
  'finance': {
    patterns: [
      /\b(kế toán|accountant|accounting|audit|kiểm toán)\b/i,
      /\b(tài chính|finance|financial|cfo|controller)\b/i,
      /\b(ngân hàng|bank|banking|teller|giao dịch viên)\b/i,
      /\b(tax|thuế|vat|hóa đơn|invoice)\b/i,
      /\b(investment|đầu tư|analyst|phân tích)\b/i,
      /\b(credit|tín dụng|loan|cho vay|thẩm định)\b/i,
      /\b(insurance|bảo hiểm|actuary)\b/i,
      /\b(treasury|cash flow|dòng tiền|budget)\b/i,
    ],
    weight: 80
  },
  'hr': {
    patterns: [
      /\b(nhân sự|hr|human resource|recruitment|tuyển dụng)\b/i,
      /\b(hành chính|admin|administrative|văn phòng)\b/i,
      /\b(training|đào tạo|l&d|learning|development)\b/i,
      /\b(c&b|compensation|benefit|lương|payroll)\b/i,
      /\b(headhunt|talent acquisition|sourcing)\b/i,
      /\b(employer branding|employee engagement)\b/i,
      /\b(hrbp|hr business partner|hr manager)\b/i,
      /\b(performance|kpi|đánh giá|review)\b/i,
    ],
    weight: 75
  },
  'engineering': {
    patterns: [
      /\b(kỹ sư|engineer|engineering|technical)\b/i,
      /\b(cơ khí|mechanical|machine|máy móc)\b/i,
      /\b(điện|electrical|điện tử|electronic)\b/i,
      /\b(automation|tự động hóa|plc|scada)\b/i,
      /\b(civil|xây dựng|construction engineer)\b/i,
      /\b(chemical|hóa học|process engineer)\b/i,
      /\b(quality|chất lượng|qc|qe|quality engineer)\b/i,
      /\b(r&d|research|development|nghiên cứu)\b/i,
      /\b(maintenance|bảo trì|bảo dưỡng)\b/i,
    ],
    weight: 75
  },
  'healthcare': {
    patterns: [
      /\b(bác sĩ|doctor|physician|y tế|medical)\b/i,
      /\b(y tá|nurse|điều dưỡng|nursing)\b/i,
      /\b(dược|pharmacist|pharmacy|dược sĩ)\b/i,
      /\b(bệnh viện|hospital|clinic|phòng khám)\b/i,
      /\b(lab|xét nghiệm|laboratory|technician)\b/i,
      /\b(dental|nha khoa|răng|dentist)\b/i,
      /\b(veterinary|thú y|pet|animal)\b/i,
      /\b(therapist|physical therapy|vật lý trị liệu)\b/i,
    ],
    weight: 85
  },
  'education': {
    patterns: [
      /\b(giáo viên|teacher|lecturer|giảng viên)\b/i,
      /\b(gia sư|tutor|teaching assistant|trợ giảng)\b/i,
      /\b(đào tạo|trainer|training|instructor)\b/i,
      /\b(english|tiếng anh|ielts|toeic|toefl)\b/i,
      /\b(school|trường|university|đại học|college)\b/i,
      /\b(academic|học thuật|curriculum|giáo trình)\b/i,
      /\b(e-learning|online learning|edtech)\b/i,
      /\b(counselor|tư vấn học đường|admissions)\b/i,
    ],
    weight: 80
  },
  'f&b': {
    patterns: [
      /\b(nhà hàng|restaurant|quán|café|cafe|coffee)\b/i,
      /\b(bartender|barista|phục vụ|waiter|waitress)\b/i,
      /\b(đầu bếp|chef|cook|bếp|kitchen)\b/i,
      /\b(f&b|food|beverage|đồ uống|thực phẩm)\b/i,
      /\b(hospitality|khách sạn|hotel|resort)\b/i,
      /\b(bakery|bánh|pastry|confectionery)\b/i,
      /\b(catering|tiệc|event food|banquet)\b/i,
      /\b(bubble tea|trà sữa|milk tea|drink)\b/i,
    ],
    weight: 80
  },
  'retail': {
    patterns: [
      /\b(bán lẻ|retail|store|cửa hàng|shop)\b/i,
      /\b(cashier|thu ngân|pos|point of sale)\b/i,
      /\b(merchandiser|trưng bày|visual)\b/i,
      /\b(inventory|tồn kho|warehouse|kho)\b/i,
      /\b(supervisor|giám sát|floor manager)\b/i,
      /\b(supermarket|siêu thị|minimart|convenience)\b/i,
      /\b(fashion retail|thời trang|clothing)\b/i,
      /\b(e-commerce|tmđt|thương mại điện tử|online shop)\b/i,
    ],
    weight: 70
  },
  'logistics': {
    patterns: [
      /\b(logistics|vận chuyển|shipping|freight)\b/i,
      /\b(supply chain|chuỗi cung ứng|scm)\b/i,
      /\b(warehouse|kho|inventory|quản lý kho)\b/i,
      /\b(import|export|xuất nhập khẩu|customs)\b/i,
      /\b(delivery|giao hàng|shipper|courier)\b/i,
      /\b(procurement|mua hàng|purchasing|vendor)\b/i,
      /\b(fleet|vận tải|transportation|driver)\b/i,
      /\b(3pl|fulfillment|distribution)\b/i,
    ],
    weight: 75
  },
  'construction': {
    patterns: [
      /\b(xây dựng|construction|building|công trình)\b/i,
      /\b(giám sát|supervisor|site engineer|công trường)\b/i,
      /\b(architect|kiến trúc sư|thiết kế công trình)\b/i,
      /\b(real estate|bất động sản|property|nhà đất)\b/i,
      /\b(surveyor|khảo sát|quantity|dự toán)\b/i,
      /\b(foreman|đội trưởng|thợ|worker)\b/i,
      /\b(safety|an toàn|hse|environment)\b/i,
      /\b(mep|điện nước|plumbing|hvac)\b/i,
    ],
    weight: 75
  },
  'manufacturing': {
    patterns: [
      /\b(sản xuất|manufacturing|production|factory)\b/i,
      /\b(nhà máy|plant|assembly|lắp ráp)\b/i,
      /\b(operator|vận hành|machine operator)\b/i,
      /\b(lean|six sigma|kaizen|5s|tps)\b/i,
      /\b(planning|kế hoạch|scheduling|mrp)\b/i,
      /\b(quality control|qc|kiểm tra chất lượng)\b/i,
      /\b(industrial|công nghiệp|ie|process)\b/i,
      /\b(textile|dệt may|garment|footwear|giày)\b/i,
    ],
    weight: 75
  },
  'other': {
    patterns: [],
    weight: 30
  }
};

// Logging
const LOG_DIR = path.join(__dirname, '../../..', 'data', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'categorization.log');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function logToFile(message: string) {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logLine);
  console.log(message);
}

// ============ REGEX CATEGORIZATION ============
function regexCategorize(title: string, description: string): { category: CategoryType; confidence: number } {
  const combined = `${title} ${description}`.toLowerCase();
  
  let bestCategory: CategoryType = 'other';
  let bestScore = 0;
  
  for (const [category, config] of Object.entries(CATEGORY_PATTERNS)) {
    if (category === 'other') continue;
    
    let matchCount = 0;
    let strongMatch = false;
    
    for (const pattern of config.patterns) {
      if (pattern.test(combined)) {
        matchCount++;
        // Title match is stronger
        if (pattern.test(title.toLowerCase())) {
          strongMatch = true;
          matchCount += 0.5;
        }
      }
    }
    
    if (matchCount > 0) {
      // Calculate confidence based on match count and weight
      const baseConfidence = config.weight;
      const matchBonus = Math.min(matchCount * 5, 15); // Max 15% bonus
      const titleBonus = strongMatch ? 10 : 0;
      const confidence = Math.min(baseConfidence + matchBonus + titleBonus, 100);
      
      if (confidence > bestScore) {
        bestScore = confidence;
        bestCategory = category as CategoryType;
      }
    }
  }
  
  return { category: bestCategory, confidence: bestScore };
}

// ============ GEMINI AI CATEGORIZATION ============
async function aiCategorize(jobs: JobForCategorization[]): Promise<Array<{ category: string; confidence: number }>> {
  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL;
  
  if (!apiKey || !apiUrl) {
    logToFile('⚠️ AI API not configured, falling back to "other" category');
    return jobs.map(() => ({ category: 'other', confidence: 50 }));
  }
  
  const categoriesList = VALID_CATEGORIES.filter(c => c !== 'other').join(', ');
  
  const jobsText = jobs.map((job, idx) => 
    `${idx + 1}. Title: "${job.title}" | Description: "${job.description?.substring(0, 200) || 'N/A'}"`
  ).join('\n');
  
  const prompt = `
Bạn là AI chuyên phân loại công việc. Phân loại ${jobs.length} công việc sau vào các category:
${categoriesList}

Danh sách công việc:
${jobsText}

Trả về JSON array với format CHÍNH XÁC (không markdown, chỉ JSON):
[{"index": 1, "category": "it-software", "confidence": 85}, {"index": 2, "category": "marketing", "confidence": 90}]

Lưu ý:
- Nếu không chắc chắn, dùng category "other"
- confidence từ 50-100, càng chắc chắn càng cao
- Chỉ dùng category trong danh sách đã cho
  `.trim();
  
  try {
    const response = await axios.post(
      `${apiUrl}?key=${apiKey}`,
      {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more consistent results
          maxOutputTokens: 1000,
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: AI_TIMEOUT,
      }
    );
    
    let result = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean markdown if present
    if (result.includes('```')) {
      result = result.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    
    const parsed = JSON.parse(result.trim());
    
    // Map results back to jobs order
    return jobs.map((_, idx) => {
      const found = parsed.find((p: any) => p.index === idx + 1);
      if (found && VALID_CATEGORIES.includes(found.category)) {
        return { category: found.category, confidence: found.confidence || 75 };
      }
      return { category: 'other', confidence: 50 };
    });
    
  } catch (error: any) {
    logToFile(`❌ AI categorization error: ${error.message}`);
    return jobs.map(() => ({ category: 'other', confidence: 50 }));
  }
}

// ============ HYBRID CATEGORIZATION ============
export async function hybridCategorize(jobs: JobForCategorization[]): Promise<{
  results: CategorizedJob[];
  stats: CategorizationStats;
}> {
  const startTime = Date.now();
  
  logToFile(`\n🔄 Starting hybrid categorization for ${jobs.length} jobs...`);
  
  const results: CategorizedJob[] = [];
  const lowConfidenceJobs: { index: number; job: JobForCategorization }[] = [];
  
  const stats: CategorizationStats = {
    total: jobs.length,
    regexHandled: 0,
    aiHandled: 0,
    avgRegexConfidence: 0,
    avgAiConfidence: 0,
    categoryDistribution: {},
    processingTimeMs: 0
  };
  
  let regexConfidenceSum = 0;
  let aiConfidenceSum = 0;
  
  // Step 1: Try regex categorization for all jobs
  logToFile('📋 Step 1: Regex pattern matching...');
  
  jobs.forEach((job, index) => {
    const { category, confidence } = regexCategorize(job.title, job.description || '');
    
    if (confidence >= CONFIDENCE_THRESHOLD) {
      // High confidence - use regex result
      results[index] = {
        ...job,
        jobCategories: category,
        categoryConfidence: confidence,
        categoryMethod: 'regex'
      };
      stats.regexHandled++;
      regexConfidenceSum += confidence;
    } else {
      // Low confidence - queue for AI processing
      lowConfidenceJobs.push({ index, job });
    }
  });
  
  logToFile(`   ✅ Regex handled: ${stats.regexHandled}/${jobs.length} jobs (confidence >= ${CONFIDENCE_THRESHOLD}%)`);
  
  // Step 2: AI batch processing for low confidence jobs
  if (lowConfidenceJobs.length > 0) {
    logToFile(`🤖 Step 2: AI categorization for ${lowConfidenceJobs.length} low-confidence jobs...`);
    
    // Process in batches
    for (let i = 0; i < lowConfidenceJobs.length; i += AI_BATCH_SIZE) {
      const batch = lowConfidenceJobs.slice(i, i + AI_BATCH_SIZE);
      const batchJobs = batch.map(b => b.job);
      
      logToFile(`   Processing batch ${Math.floor(i / AI_BATCH_SIZE) + 1}/${Math.ceil(lowConfidenceJobs.length / AI_BATCH_SIZE)}...`);
      
      const aiResults = await aiCategorize(batchJobs);
      
      batch.forEach((item, batchIdx) => {
        const aiResult = aiResults[batchIdx];
        results[item.index] = {
          ...item.job,
          jobCategories: aiResult.category,
          categoryConfidence: aiResult.confidence,
          categoryMethod: 'ai'
        };
        stats.aiHandled++;
        aiConfidenceSum += aiResult.confidence;
      });
      
      // Small delay between batches to avoid rate limiting
      if (i + AI_BATCH_SIZE < lowConfidenceJobs.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    logToFile(`   ✅ AI handled: ${stats.aiHandled} jobs`);
  }
  
  // Calculate stats
  stats.avgRegexConfidence = stats.regexHandled > 0 
    ? Math.round(regexConfidenceSum / stats.regexHandled) 
    : 0;
  stats.avgAiConfidence = stats.aiHandled > 0 
    ? Math.round(aiConfidenceSum / stats.aiHandled) 
    : 0;
  
  // Category distribution
  results.forEach(job => {
    stats.categoryDistribution[job.jobCategories] = 
      (stats.categoryDistribution[job.jobCategories] || 0) + 1;
  });
  
  stats.processingTimeMs = Date.now() - startTime;
  
  // Log summary
  logToFile('\n📊 Categorization Summary:');
  logToFile(`   Total jobs: ${stats.total}`);
  logToFile(`   Regex handled: ${stats.regexHandled} (${Math.round(stats.regexHandled / stats.total * 100)}%)`);
  logToFile(`   AI handled: ${stats.aiHandled} (${Math.round(stats.aiHandled / stats.total * 100)}%)`);
  logToFile(`   Avg regex confidence: ${stats.avgRegexConfidence}%`);
  logToFile(`   Avg AI confidence: ${stats.avgAiConfidence}%`);
  logToFile(`   Processing time: ${stats.processingTimeMs}ms`);
  logToFile('\n   Category distribution:');
  Object.entries(stats.categoryDistribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      logToFile(`     - ${cat}: ${count} (${Math.round(count / stats.total * 100)}%)`);
    });
  
  return { results, stats };
}

// ============ UTILITY FUNCTIONS ============
export function getCategorizationStats(): string | null {
  if (fs.existsSync(LOG_FILE)) {
    return fs.readFileSync(LOG_FILE, 'utf-8');
  }
  return null;
}

export function clearCategorizationLogs(): void {
  if (fs.existsSync(LOG_FILE)) {
    fs.unlinkSync(LOG_FILE);
    logToFile('🗑️ Categorization logs cleared');
  }
}

// Export for testing
export { regexCategorize, aiCategorize, VALID_CATEGORIES };

// ============ CLI TEST ============
async function testCategorizer() {
  const testJobs: JobForCategorization[] = [
    // Clear jobs (should be handled by regex)
    { title: 'Senior React Developer', description: 'Looking for experienced React developer with Node.js skills' },
    { title: 'Marketing Manager', description: 'Digital marketing, SEO, content strategy' },
    { title: 'Kế toán tổng hợp', description: 'Xử lý sổ sách, báo cáo tài chính, thuế' },
    
    // Ambiguous jobs (should be handled by AI - no clear keywords)
    { title: 'Nhân viên', description: 'Làm việc tại văn phòng, hỗ trợ các công việc chung' },
    { title: 'Trợ lý', description: 'Hỗ trợ giám đốc trong các công việc hàng ngày' },
    { title: 'Cộng tác viên', description: 'Làm việc bán thời gian, linh hoạt thời gian' },
    { title: 'Thực tập sinh', description: 'Vị trí thực tập cho sinh viên mới ra trường' },
    { title: 'Chuyên viên', description: 'Phụ trách các công việc chuyên môn trong công ty' },
  ];
  
  console.log('🧪 Testing Hybrid Categorizer with ambiguous job titles\n');
  const { results, stats } = await hybridCategorize(testJobs);
  
  console.log('\n📋 Results:');
  results.forEach((job, idx) => {
    console.log(`${idx + 1}. "${job.title}"`);
    console.log(`   → ${job.jobCategories} (${job.categoryConfidence}% via ${job.categoryMethod})`);
  });
  
  console.log('\n📊 Summary:');
  console.log(`   Regex: ${stats.regexHandled}/${stats.total} jobs`);
  console.log(`   AI: ${stats.aiHandled}/${stats.total} jobs`);
}

// Run test if executed directly
if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '../../..', '.env') });
  testCategorizer().catch(console.error);
}
