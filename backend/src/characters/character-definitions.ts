export interface CharacterDefinition {
  slug: string;
  name: string;
  nameZh?: string;
  tagline: string;
  role: string;
  system_prompt: string;
}

/**
 * Static definitions for the 13 pre-built character personas.
 * system_prompt content is sourced from the nuwa-skill project
 * (https://github.com/alchaincyf/nuwa-skill).
 *
 * system_prompt will be loaded from external .md files at runtime
 * to keep this file manageable.
 */
export const CHARACTER_DEFINITIONS: CharacterDefinition[] = [
  {
    slug: 'steve-jobs',
    name: 'Steve Jobs',
    tagline: 'Product & Design Visionary',
    role: 'Product/Design',
    system_prompt: '',
  },
  {
    slug: 'elon-musk',
    name: 'Elon Musk',
    tagline: 'Engineering & First Principles',
    role: 'Engineering',
    system_prompt: '',
  },
  {
    slug: 'charlie-munger',
    name: 'Charlie Munger',
    nameZh: '查理·芒格',
    tagline: 'Investment & Mental Models',
    role: 'Investment',
    system_prompt: '',
  },
  {
    slug: 'richard-feynman',
    name: 'Richard Feynman',
    tagline: 'Learning & Scientific Thinking',
    role: 'Science/Education',
    system_prompt: '',
  },
  {
    slug: 'naval-ravikant',
    name: 'Naval Ravikant',
    tagline: 'Wealth & Life Philosophy',
    role: 'Philosophy',
    system_prompt: '',
  },
  {
    slug: 'paul-graham',
    name: 'Paul Graham',
    tagline: 'Startups & Writing',
    role: 'Startups',
    system_prompt: '',
  },
  {
    slug: 'zhang-yiming',
    name: '张一鸣',
    nameZh: '张一鸣',
    tagline: 'Product & Organization Building',
    role: 'Product/Organization',
    system_prompt: '',
  },
  {
    slug: 'andrej-karpathy',
    name: 'Andrej Karpathy',
    tagline: 'AI & Deep Learning',
    role: 'AI/Engineering',
    system_prompt: '',
  },
  {
    slug: 'ilya-sutskever',
    name: 'Ilya Sutskever',
    tagline: 'AI Safety & Research Taste',
    role: 'AI Research',
    system_prompt: '',
  },
  {
    slug: 'mrbeast',
    name: 'MrBeast',
    tagline: 'Content Creation & YouTube',
    role: 'Content Creation',
    system_prompt: '',
  },
  {
    slug: 'donald-trump',
    name: 'Donald Trump',
    tagline: 'Negotiation & Power Dynamics',
    role: 'Negotiation',
    system_prompt: '',
  },
  {
    slug: 'nassim-taleb',
    name: 'Nassim Taleb',
    nameZh: '纳西姆·塔勒布',
    tagline: 'Risk & Antifragility',
    role: 'Risk/Philosophy',
    system_prompt: '',
  },
  {
    slug: 'zhang-xuefeng',
    name: '张雪峰',
    nameZh: '张雪峰',
    tagline: 'Education & Career Planning',
    role: 'Education/Career',
    system_prompt: '',
  },
];
