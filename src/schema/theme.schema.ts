import { z } from 'zod';
import {
  TemplateIdSchema,
  ThemeConfigSchema,
  VisualStyleSchema,
  type TemplateId,
  type ThemeConfig,
} from './portfolio.schema';

/**
 * Preset theme definition pairing a portfolio archetype with coordinated colors and typography.
 */
export const ThemePresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  templateId: TemplateIdSchema,
  recommendedVisualStyle: VisualStyleSchema,
  theme: ThemeConfigSchema,
});

export type ThemePreset = z.infer<typeof ThemePresetSchema>;

/**
 * Automated theme generation rule mapping context triggers to cohesive design tokens.
 */
export interface AutomatedThemeRule {
  domain: string;
  keywords: string[];
  theme: ThemeConfig;
  atmosphere: string;
}

/**
 * R1 & R3: Automated Theme Generation Rule Table for the 7 standard domains.
 */
export const AUTOMATED_THEME_RULE_TABLE: AutomatedThemeRule[] = [
  {
    domain: 'Environmental & Ecology',
    keywords: [
      'môi trường',
      'sinh thái',
      'bảo tồn',
      'rừng',
      'năng lượng xanh',
      'carbon',
      'tái chế',
      'environment',
      'sustainability',
      'green',
      'ecology',
      'eco',
      'climate',
      'nông nghiệp',
    ],
    theme: {
      primaryColor: '#2D6A4F',
      secondaryColor: '#40916C',
      backgroundColor: '#F2F7F4',
      surfaceColor: '#FFFFFF',
      textColor: '#14281D',
      headingFont: 'Lora',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'lg',
      pageTransition: 'smooth-scroll',
    },
    atmosphere:
      'Harmonious botanical greens, sage borders, emerald stars, natural paper feel',
  },
  {
    domain: 'Technology & AI Engineering',
    keywords: [
      'ai',
      'prompt',
      'llm',
      'lập trình',
      'code',
      'phần mềm',
      'machine learning',
      'data',
      'cloud',
      'algorithm',
      'cyber',
      'developer',
      'next.js',
      'python',
      'api',
    ],
    theme: {
      primaryColor: '#0284C7',
      secondaryColor: '#6366F1',
      backgroundColor: '#F0F9FF',
      surfaceColor: '#FFFFFF',
      textColor: '#0C2340',
      headingFont: 'Space Grotesk',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'md',
      pageTransition: 'smooth-scroll',
    },
    atmosphere:
      'High-precision tech accents, electric cobalt pills, clean cybernetic lines',
  },
  {
    domain: 'Business & Finance Growth',
    keywords: [
      'kinh doanh',
      'tài chính',
      'ngân hàng',
      'doanh thu',
      'kpi',
      'chiến lược',
      'thị trường',
      'marketing',
      'growth',
      'finance',
      'business',
      'roi',
      'investment',
      'bán hàng',
    ],
    theme: {
      primaryColor: '#0F766E',
      secondaryColor: '#0E7490',
      backgroundColor: '#F0FDFA',
      surfaceColor: '#FFFFFF',
      textColor: '#0F172A',
      headingFont: 'Plus Jakarta Sans',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'md',
      pageTransition: 'smooth-scroll',
    },
    atmosphere:
      'Authoritative corporate teal, crisp metric chip cards, high trust contrast',
  },
  {
    domain: 'Medical & Health Sciences',
    keywords: [
      'y tế',
      'sức khỏe',
      'dược phẩm',
      'bệnh viện',
      'điều trị',
      'chăm sóc',
      'medical',
      'healthcare',
      'pharma',
      'clinic',
      'biology',
      'doctor',
      'wellness',
      'dinh dưỡng',
    ],
    theme: {
      primaryColor: '#0284C7',
      secondaryColor: '#0D9488',
      backgroundColor: '#F8FAFC',
      surfaceColor: '#FFFFFF',
      textColor: '#0F172A',
      headingFont: 'Be Vietnam Pro',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'md',
      pageTransition: 'smooth-scroll',
    },
    atmosphere:
      'Pristine clarity, balanced serene turquoise, reassuring medical professionalism',
  },
  {
    domain: 'Creative Showcase & Visual Arts',
    keywords: [
      'thiết kế',
      'bộ nhận diện',
      'poster',
      'banner',
      'figma',
      'canva',
      'nghệ thuật',
      'nhiếp ảnh',
      'creative',
      'design',
      'art',
      'fashion',
      'illustration',
      'branding',
    ],
    theme: {
      primaryColor: '#D95D39',
      secondaryColor: '#2563EB',
      backgroundColor: '#FFF9F5',
      surfaceColor: '#FFFFFF',
      textColor: '#1F1A17',
      headingFont: 'Playfair Display',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'md',
      pageTransition: 'smooth-scroll',
    },
    atmosphere:
      'Bold artistic energy, dynamic terracotta accents, gallery exhibition polish',
  },
  {
    domain: 'Education & Humanities',
    keywords: [
      'sư phạm',
      'giáo dục',
      'học liệu',
      'văn học',
      'ngôn ngữ',
      'lịch sử',
      'triết học',
      'education',
      'pedagogy',
      'teaching',
      'literature',
      'history',
      'nghiên cứu',
    ],
    theme: {
      primaryColor: '#8C5B2B',
      secondaryColor: '#A26744',
      backgroundColor: '#FAF6F0',
      surfaceColor: '#FFFDF9',
      textColor: '#2C1E14',
      headingFont: 'Merriweather',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'lg',
      pageTransition: 'smooth-scroll',
    },
    atmosphere:
      'Scholarly warmth, archival parchment background, distinguished academic tone',
  },
  {
    domain: 'Medicine & Healthcare',
    keywords: [
      'dược',
      'thuốc',
      'y khoa',
      'y dược',
      'bác sĩ',
      'lâm sàng',
      'gerd',
      'craap',
      'pharmacy',
      'medicine',
      'ump',
      'dược học',
      'sức khỏe',
    ],
    theme: {
      primaryColor: '#7B1113',
      secondaryColor: '#C29B38',
      backgroundColor: '#FFFDF9',
      surfaceColor: '#FFFFFF',
      textColor: '#2B1810',
      headingFont: 'Playfair Display',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'lg',
      pageTransition: 'slide-deck',
    },
    atmosphere:
      'Archival apothecary crimson, warm parchment ivory, distinguished medical-pharmaceutical prestige',
  },
  {
    domain: 'Digital Marketing & Content Creation',
    keywords: [
      'sáng tạo nội dung',
      'content creator',
      'seo',
      'mạng xã hội',
      'kể chuyện',
      'copywriting',
      'marketing',
      'tiktok',
      'youtube',
      'social media',
    ],
    theme: {
      primaryColor: '#722F37',
      secondaryColor: '#EFDFBB',
      backgroundColor: '#FDF9F2',
      surfaceColor: '#FFFFFF',
      textColor: '#2D1418',
      headingFont: 'Playfair Display',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'lg',
      pageTransition: 'slide-deck',
    },
    atmosphere:
      'Rich bordeaux velvet, champagne warmth, dynamic performance storytelling and content flair',
  },
  {
    domain: 'Educational Sciences & Pedagogy',
    keywords: [
      'khoa học giáo dục',
      'giáo dục',
      'sư phạm',
      'tâm lý học',
      'khai phóng',
      'ued',
      'dạy học',
      'học liệu',
      'education',
      'pedagogy',
    ],
    theme: {
      primaryColor: '#9B302D',
      secondaryColor: '#A7403B',
      backgroundColor: '#EDEAE2',
      surfaceColor: '#FFFFFF',
      textColor: '#282828',
      headingFont: 'Lora',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'lg',
      pageTransition: 'slide-deck',
    },
    atmosphere:
      'Warm terracotta crimson, refined alabaster ivory, distinguished educational science and pedagogical insight',
  },
  {
    domain: 'Canva Classic Editorial',
    keywords: ['portfolio-mau-hoan-chinh', 'canva', 'editorial', 'âm nhạc'],
    theme: {
      primaryColor: '#735340',
      secondaryColor: '#5D4037',
      backgroundColor: '#FFF3E6',
      surfaceColor: '#FFF8F0',
      textColor: '#3E2723',
      headingFont: 'Playfair Display',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'lg',
      pageTransition: 'slide-deck',
    },
    atmosphere: '1:1 Canva reference parity matching portfolio-mau-hoan-chinh',
  },
];

/**
 * Resolves a context-aware theme configuration from assignment categories, topics, or keywords.
 * Defaults to Canva Classic Editorial if no domain matched.
 */
export function resolveThemeFromContext(
  categoryOrKeywords: string[] | string
): ThemeConfig {
  const canvaRule =
    AUTOMATED_THEME_RULE_TABLE.find(
      (r) => r.domain === 'Canva Classic Editorial'
    ) ?? AUTOMATED_THEME_RULE_TABLE[6];

  if (!categoryOrKeywords) {
    return { ...canvaRule.theme };
  }

  const inputList = Array.isArray(categoryOrKeywords)
    ? categoryOrKeywords
    : [categoryOrKeywords];

  const fullText = inputList.filter(Boolean).join(' ').toLowerCase();
  if (!fullText.trim()) {
    return { ...canvaRule.theme };
  }

  let bestRule = canvaRule;
  let bestScore = 0;

  for (const rule of AUTOMATED_THEME_RULE_TABLE) {
    let score = 0;
    for (const kw of rule.keywords) {
      const kwLower = kw.toLowerCase();
      if (kwLower.length <= 3) {
        // Word boundary match for short acronyms like 'ai', 'eco', 'llm'
        const regex = new RegExp(`(^|[^a-z0-9à-ỹ])${kwLower}([^a-z0-9à-ỹ]|$)`, 'i');
        if (regex.test(fullText)) {
          score += 3;
        }
      } else {
        if (fullText.includes(kwLower)) {
          score += kwLower.includes(' ') ? 4 : 2;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  if (bestScore === 0) {
    return { ...canvaRule.theme };
  }

  return { ...bestRule.theme };
}

/**
 * Curated theme presets aligned with Canva Editorial and the 5 additional archetypes.
 */
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'canva-editorial-pastel',
    name: 'Canva Editorial Cream & Cocoa',
    description: 'Chuẩn hóa 1:1 theo mẫu Canva hoàn chỉnh: nền giấy kem #FFF3E6, bề mặt #FFF8F0, chữ nâu espresso #3E2723, nhấn mocha #735340 và cacao #5D4037.',
    templateId: 'canva-editorial',
    recommendedVisualStyle: 'canva-pastel-graphic',
    theme: {
      primaryColor: '#735340',
      secondaryColor: '#5D4037',
      backgroundColor: '#FFF3E6',
      surfaceColor: '#FFF8F0',
      textColor: '#3E2723',
      headingFont: 'Playfair Display',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'lg',
      pageTransition: 'slide-deck',
    },
  },
  {
    id: 'bento-cream-ink',
    name: 'Bento Grid Studio',
    description: 'Lưới thẻ module hiện đại, bo góc mềm mại, tương phản rõ nét.',
    templateId: 'bento-grid',
    recommendedVisualStyle: '3d-render',
    theme: {
      primaryColor: '#4F46E5',
      secondaryColor: '#0EA5E9',
      backgroundColor: '#F4F4F0',
      surfaceColor: '#FFFFFF',
      textColor: '#18181B',
      headingFont: 'Be Vietnam Pro',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'lg',
      pageTransition: 'smooth-scroll',
    },
  },
  {
    id: 'framer-minimal-mono',
    name: 'Framer Minimalist Mono',
    description: 'Tối giản kiểu Swiss editorial, tập trung vào typography và khoảng trắng.',
    templateId: 'framer-minimal',
    recommendedVisualStyle: 'minimal-photo',
    theme: {
      primaryColor: '#111827',
      secondaryColor: '#6B7280',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#F9FAFB',
      textColor: '#111827',
      headingFont: 'Be Vietnam Pro',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'sm',
      pageTransition: 'fade',
    },
  },
  {
    id: 'creative-showcase-terracotta',
    name: 'Creative Showcase Behance',
    description: 'Nổi bật hình ảnh lớn, tông đất nung và xanh cobalt giàu năng lượng sáng tạo.',
    templateId: 'creative-showcase',
    recommendedVisualStyle: 'editorial-illustration',
    theme: {
      primaryColor: '#D95D39',
      secondaryColor: '#1D4ED8',
      backgroundColor: '#FFF9F5',
      surfaceColor: '#FFFFFF',
      textColor: '#1F1A17',
      headingFont: 'Playfair Display',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'md',
      pageTransition: 'smooth-scroll',
    },
  },
  {
    id: 'growth-marketer-emerald',
    name: 'Growth Marketer Data-Driven',
    description: 'Tập trung số liệu KPI, case study tăng trưởng với sắc xanh ngọc chuyên nghiệp.',
    templateId: 'growth-marketer',
    recommendedVisualStyle: 'editorial-illustration',
    theme: {
      primaryColor: '#059669',
      secondaryColor: '#0F172A',
      backgroundColor: '#F0FDF9',
      surfaceColor: '#FFFFFF',
      textColor: '#0F172A',
      headingFont: 'Be Vietnam Pro',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'md',
      pageTransition: 'smooth-scroll',
    },
  },
  {
    id: 'tech-developer-slate',
    name: 'Tech & AI Builder Dark',
    description: 'Giao diện tối sắc nét cho kỹ sư AI, lập trình viên và phân tích dữ liệu.',
    templateId: 'tech-developer',
    recommendedVisualStyle: '3d-render',
    theme: {
      primaryColor: '#38BDF8',
      secondaryColor: '#A855F7',
      backgroundColor: '#0B1120',
      surfaceColor: '#151E32',
      textColor: '#F1F5F9',
      headingFont: 'Be Vietnam Pro',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'md',
      pageTransition: 'fade',
    },
  },
  {
    id: 'canva-warm-editorial-slate',
    name: 'Canva Warm Editorial Slate',
    description:
      'Phong cách biên tập ấm áp: nền giấy archival #F0EFE2, xanh slate denim #326586, vàng bơ cát #F4E9D4, chữ espresso đậm #1C1412.',
    templateId: 'warm-editorial',
    recommendedVisualStyle: 'editorial-illustration',
    theme: {
      primaryColor: '#326586',
      secondaryColor: '#F4E9D4',
      backgroundColor: '#F0EFE2',
      surfaceColor: '#FFFFFF',
      textColor: '#1C1412',
      headingFont: 'Playfair Display',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'lg',
      pageTransition: 'slide-deck',
      effects: {
        enableFloat: true,
        enableGlow: false,
        enableTilt: false,
        enableSparkles: true,
        revealVariant: 'fade-up',
        enableParallax: false,
      },
      backgroundIllustration: {
        mode: 'preset',
        presetId: 'canva-musical',
        opacity: 0.35,
        blur: 0,
        position: 'cover',
      },
    },
  },
  {
    id: 'canva-bold-creative-rose',
    name: 'Canva Bold Creative Rose',
    description:
      'Phong cách đồ họa sáng tạo nổi bật: nền hồng phấn #FDF1F5, hồng tro ấm #92736C, xanh prussian ink #304254.',
    templateId: 'creative-bold',
    recommendedVisualStyle: 'canva-pastel-graphic',
    theme: {
      primaryColor: '#92736C',
      secondaryColor: '#304254',
      backgroundColor: '#FDF1F5',
      surfaceColor: '#FFFFFF',
      textColor: '#304254',
      headingFont: 'Playfair Display',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'lg',
      pageTransition: 'slide-deck',
      effects: {
        enableFloat: true,
        enableGlow: true,
        enableTilt: true,
        enableSparkles: true,
        revealVariant: 'zoom-in',
        enableParallax: false,
      },
      backgroundIllustration: {
        mode: 'preset',
        presetId: 'abstract-blobs',
        opacity: 0.35,
        blur: 0,
        position: 'cover',
      },
    },
  },
  {
    id: 'canva-minimal-chic-marine',
    name: 'Canva Minimal Chic Marine',
    description:
      'Phong cách tối giản thanh lịch: tương phản xanh hải quân #326586 và kem bơ custard #FFFCE2, khối liên hệ rõ nét.',
    templateId: 'minimal-chic',
    recommendedVisualStyle: 'minimal-photo',
    theme: {
      primaryColor: '#326586',
      secondaryColor: '#FFFCE2',
      backgroundColor: '#FFFCE2',
      surfaceColor: '#FFFFFF',
      textColor: '#326586',
      headingFont: 'Plus Jakarta Sans',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'md',
      pageTransition: 'smooth-scroll',
      effects: {
        enableFloat: false,
        enableGlow: false,
        enableTilt: false,
        enableSparkles: false,
        revealVariant: 'slide-left',
        enableParallax: false,
      },
      backgroundIllustration: {
        mode: 'preset',
        presetId: 'minimalist-contour',
        opacity: 0.35,
        blur: 0,
        position: 'cover',
      },
    },
  },
  {
    id: 'canva-vibrant-student-indigo',
    name: 'Canva Vibrant Student Indigo',
    description:
      'Phong cách sinh viên năng động: nền kem bơ #FFFCE2, xanh indigo cornflower #566E99, chữ than đậm #304254.',
    templateId: 'vibrant-student',
    recommendedVisualStyle: 'canva-pastel-graphic',
    theme: {
      primaryColor: '#566E99',
      secondaryColor: '#FFFFFF',
      backgroundColor: '#FFFCE2',
      surfaceColor: '#FFFFFF',
      textColor: '#304254',
      headingFont: 'Playfair Display',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'lg',
      pageTransition: 'slide-deck',
      effects: {
        enableFloat: true,
        enableGlow: false,
        enableTilt: true,
        enableSparkles: true,
        revealVariant: 'fade-up',
        enableParallax: false,
      },
      backgroundIllustration: {
        mode: 'preset',
        presetId: 'geometric-dots',
        opacity: 0.35,
        blur: 0,
        position: 'pattern-repeat',
      },
    },
  },
  {
    id: 'canva-artistic-organic-burgundy',
    name: 'Canva Artistic Organic Burgundy',
    description:
      'Phong cách nghệ thuật đường cong hữu cơ: nền quả mơ đào #FFECD1, đỏ burgundy nhung #3E000C, espresso cherry #381313.',
    templateId: 'artistic-organic',
    recommendedVisualStyle: 'editorial-illustration',
    theme: {
      primaryColor: '#3E000C',
      secondaryColor: '#381313',
      backgroundColor: '#FFECD1',
      surfaceColor: '#FFFFFF',
      textColor: '#3E000C',
      headingFont: 'Playfair Display',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'full',
      pageTransition: 'slide-deck',
      effects: {
        enableFloat: true,
        enableGlow: true,
        enableTilt: false,
        enableSparkles: true,
        revealVariant: 'zoom-in',
        enableParallax: true,
      },
      backgroundIllustration: {
        mode: 'preset',
        presetId: 'abstract-blobs',
        opacity: 0.35,
        blur: 0,
        position: 'cover',
      },
    },
  },
  {
    id: 'canva-academic-crimson',
    name: 'Canva Academic Crimson',
    description:
      'Phong cách học thuật sư phạm: nền đá vôi archival #EDEAE2, đỏ gạch crimson #9B302D, mahogany đậm #6A1C1B.',
    templateId: 'academic-presentation',
    recommendedVisualStyle: 'editorial-illustration',
    theme: {
      primaryColor: '#9B302D',
      secondaryColor: '#6A1C1B',
      backgroundColor: '#EDEAE2',
      surfaceColor: '#FFFFFF',
      textColor: '#9B302D',
      headingFont: 'Merriweather',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'md',
      pageTransition: 'slide-deck',
      effects: {
        enableFloat: false,
        enableGlow: false,
        enableTilt: false,
        enableSparkles: true,
        revealVariant: 'fade-up',
        enableParallax: false,
      },
      backgroundIllustration: {
        mode: 'preset',
        presetId: 'vintage-parchment',
        opacity: 0.35,
        blur: 0,
        position: 'cover',
      },
    },
  },
  {
    id: 'canva-medical-ruby-mocanh',
    name: 'Canva Medical Ruby',
    description:
      'Phong cách Tạp chí Y Dược cao cấp: header đỏ rượu ruby #7B1113, nền kem ngà #FFFDF9, chữ espresso mahogany #2B1810, cấu trúc Mục tiêu - Quy trình - Sản phẩm và banner Tổng kết nổi bật.',
    templateId: 'medical-ruby',
    recommendedVisualStyle: 'editorial-illustration',
    theme: {
      primaryColor: '#7B1113',
      secondaryColor: '#C29B38',
      backgroundColor: '#FFFDF9',
      surfaceColor: '#FFFFFF',
      textColor: '#2B1810',
      headingFont: 'Playfair Display',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'lg',
      pageTransition: 'slide-deck',
      effects: {
        enableFloat: true,
        enableGlow: false,
        enableTilt: false,
        enableSparkles: true,
        revealVariant: 'fade-up',
        enableParallax: false,
      },
      backgroundIllustration: {
        mode: 'preset',
        presetId: 'vintage-parchment',
        opacity: 0.28,
        blur: 0,
        position: 'cover',
      },
    },
  },
  {
    id: 'canva-clinical-navy-thutrang',
    name: 'Canva Clinical Navy',
    description:
      'Phong cách Y khoa hiện đại chính xác: sắc xanh hải quân lâm sàng #1A1264, nhấn cobalt #383E8C, nền đá phiến mát #F8FAFC, chữ midnight #0C0838.',
    templateId: 'clinical-navy',
    recommendedVisualStyle: 'minimal-photo',
    theme: {
      primaryColor: '#1A1264',
      secondaryColor: '#383E8C',
      backgroundColor: '#F8FAFC',
      surfaceColor: '#FFFFFF',
      textColor: '#0C0838',
      headingFont: 'Plus Jakarta Sans',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'md',
      pageTransition: 'smooth-scroll',
      effects: {
        enableFloat: false,
        enableGlow: false,
        enableTilt: false,
        enableSparkles: false,
        revealVariant: 'slide-left',
        enableParallax: false,
      },
      backgroundIllustration: {
        mode: 'preset',
        presetId: 'minimalist-contour',
        opacity: 0.25,
        blur: 0,
        position: 'cover',
      },
    },
  },
  {
    id: 'canva-pedagogical-mauve-nguyetanh',
    name: 'Canva Pedagogical Mauve',
    description:
      'Phong cách Sư phạm & Khoa học Giáo dục: hồng mauve tro ấm #9B5464, đất nung mềm #D36F73, nền lanh tự nhiên #F9F6F2, chữ mận than #3A2329.',
    templateId: 'pedagogical-mauve',
    recommendedVisualStyle: 'editorial-illustration',
    theme: {
      primaryColor: '#9B5464',
      secondaryColor: '#D36F73',
      backgroundColor: '#F9F6F2',
      surfaceColor: '#FFFFFF',
      textColor: '#3A2329',
      headingFont: 'Lora',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'lg',
      pageTransition: 'slide-deck',
      effects: {
        enableFloat: true,
        enableGlow: false,
        enableTilt: true,
        enableSparkles: true,
        revealVariant: 'fade-up',
        enableParallax: false,
      },
      backgroundIllustration: {
        mode: 'preset',
        presetId: 'abstract-blobs',
        opacity: 0.28,
        blur: 0,
        position: 'cover',
      },
    },
  },
  {
    id: 'canva-content-creator-bordeaux-hale',
    name: 'Canva Content Creator Bordeaux',
    description:
      'Phong cách Sáng tạo nội dung số & Truyền thông: bordeaux nhung quý phái #722F37, kem champagne #EFDFBB, nền vani ấm #FDF9F2, chữ chocolate #2D1418.',
    templateId: 'content-creator',
    recommendedVisualStyle: 'canva-pastel-graphic',
    theme: {
      primaryColor: '#722F37',
      secondaryColor: '#EFDFBB',
      backgroundColor: '#FDF9F2',
      surfaceColor: '#FFFFFF',
      textColor: '#2D1418',
      headingFont: 'Playfair Display',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'lg',
      pageTransition: 'slide-deck',
      effects: {
        enableFloat: true,
        enableGlow: true,
        enableTilt: false,
        enableSparkles: true,
        revealVariant: 'zoom-in',
        enableParallax: false,
      },
      backgroundIllustration: {
        mode: 'preset',
        presetId: 'geometric-dots',
        opacity: 0.30,
        blur: 0,
        position: 'pattern-repeat',
      },
    },
  },
  {
    id: 'canva-oceanic-teal-duong',
    name: 'Canva Oceanic Teal',
    description:
      'Phong cách Ngôn ngữ & Văn hóa: xanh mòng két đại dương #0A5871, xanh denim #326586, nền kem cổ điển #FFF9F0, chữ than đậm #052C39.',
    templateId: 'oceanic-teal',
    recommendedVisualStyle: 'editorial-illustration',
    theme: {
      primaryColor: '#0A5871',
      secondaryColor: '#326586',
      backgroundColor: '#FFF9F0',
      surfaceColor: '#FFFFFF',
      textColor: '#052C39',
      headingFont: 'Plus Jakarta Sans',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'md',
      pageTransition: 'smooth-scroll',
      effects: {
        enableFloat: false,
        enableGlow: false,
        enableTilt: false,
        enableSparkles: true,
        revealVariant: 'fade-up',
        enableParallax: false,
      },
      backgroundIllustration: {
        mode: 'preset',
        presetId: 'vintage-parchment',
        opacity: 0.30,
        blur: 0,
        position: 'cover',
      },
    },
  },
  {
    id: 'canva-educational-terracotta-hoai',
    name: 'Canva Educational Terracotta',
    description:
      'Phong cách Khoa học Giáo dục: tông đỏ đất nung #9B302D, kem xám ấm #EDEAE2, chữ espresso than #282828, cấu trúc nghiên cứu khai phóng và khung vòm arch-window.',
    templateId: 'educational-terracotta',
    recommendedVisualStyle: 'editorial-illustration',
    theme: {
      primaryColor: '#9B302D',
      secondaryColor: '#A7403B',
      backgroundColor: '#EDEAE2',
      surfaceColor: '#FFFFFF',
      textColor: '#282828',
      headingFont: 'Lora',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'lg',
      pageTransition: 'slide-deck',
      effects: {
        enableFloat: true,
        enableGlow: false,
        enableTilt: true,
        enableSparkles: true,
        revealVariant: 'fade-up',
        enableParallax: false,
      },
      backgroundIllustration: {
        mode: 'preset',
        presetId: 'vintage-parchment',
        opacity: 0.28,
        blur: 0,
        position: 'cover',
      },
    },
  },
  {
    id: 'canva-pedagogical-rose-linh',
    name: 'Canva Pedagogical Rose',
    description:
      'Phong cách Tâm lý & Công nghệ Giáo dục: hồng bụi thanh lịch #B76E79, nhấn xanh denim #326586, nền kem phấn #FDF6F6, chữ than #282828.',
    templateId: 'pedagogical-rose',
    recommendedVisualStyle: 'editorial-illustration',
    theme: {
      primaryColor: '#B76E79',
      secondaryColor: '#326586',
      backgroundColor: '#FDF6F6',
      surfaceColor: '#FFFFFF',
      textColor: '#282828',
      headingFont: 'Playfair Display',
      bodyFont: 'Be Vietnam Pro',
      borderRadius: 'md',
      pageTransition: 'slide-deck',
      effects: {
        enableFloat: true,
        enableGlow: false,
        enableTilt: false,
        enableSparkles: true,
        revealVariant: 'fade-up',
        enableParallax: false,
      },
      backgroundIllustration: {
        mode: 'preset',
        presetId: 'abstract-blobs',
        opacity: 0.25,
        blur: 0,
        position: 'cover',
      },
    },
  },
];

export const VIETNAMESE_FONT_OPTIONS = [
  'Playfair Display',
  'Be Vietnam Pro',
  'Lora',
  'Plus Jakarta Sans',
  'Merriweather',
  'Space Grotesk',
] as const;

/**
 * Find a theme preset by its unique ID.
 */
export function getThemePresetById(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id);
}

/**
 * Filter all theme presets associated with a given portfolio archetype template.
 */
export function getThemePresetsByTemplateId(templateId: TemplateId): ThemePreset[] {
  return THEME_PRESETS.filter((p) => p.templateId === templateId);
}

/**
 * Get the canonical default theme preset for a given template.
 */
export function getDefaultPresetForTemplate(templateId: TemplateId): ThemePreset {
  return (
    THEME_PRESETS.find((p) => p.templateId === templateId) ?? THEME_PRESETS[0]
  );
}

/**
 * Retrieve all 13 Canva creative theme presets.
 */
export function getCanvaCreativeThemePresets(): ThemePreset[] {
  return THEME_PRESETS.filter((p) =>
    [
      'warm-editorial',
      'creative-bold',
      'minimal-chic',
      'vibrant-student',
      'artistic-organic',
      'academic-presentation',
      'medical-ruby',
      'clinical-navy',
      'pedagogical-mauve',
      'content-creator',
      'oceanic-teal',
      'educational-terracotta',
      'pedagogical-rose',
    ].includes(p.templateId)
  );
}
