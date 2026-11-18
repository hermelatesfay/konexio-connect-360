export type Role = 'learner' | 'alumni' | 'employer' | 'partner' | 'donor' | 'admin' | 'user';
export type PartnerType = 'Employer' | 'Donor' | 'Client' | 'Training partner';

export interface LocationImpact {
  business_id: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  learners_trained: number;
  graduates: number;
  employed_or_freelancing: number;
  women_pct: number;
  cohorts_completed: number;
}

export interface PathwayInfo {
  code: string;
  name: string;
  description: string;
  status: 'Available' | 'Completed';
  learners_enrolled: number;
  completed: number;
  freelancing_active: number;
  avg_days_to_first_gig: number;
}

export interface CourseModule {
  part: string;
  code: string;
  title: string;
  duration: string;
  submodules: string[];
}

export interface YearlyImpact {
  year: number;
  is_ytd: boolean;
  learners_trained: number;
  graduates: number;
  employed_or_freelancing_pct: number;
  women_pct: number;
  countries_active: number;
  cohorts_completed: number;
  employer_partners_cumulative: number;
  note: string | null;
}

export interface AnnualReport {
  year: number;
  title: string;
  vision_statement: string;
  director_message?: string;
  highlights?: string[];
  pdf_url: string;
  learners_trained: number;
  graduates: number;
  graduation_rate_pct: number;
  employed_or_freelancing_pct: number;
  women_pct: number;
  countries: number;
  cohorts: number;
  employer_partners: number;
}

export type AlumniAvailability =
  | 'Available for freelance work'
  | 'Available part-time'
  | 'Open to full-time roles'
  | 'Open to work'
  | 'Freelancing'
  | 'Employed'
  | 'Available for projects';

export interface SeedAlumnus {
  business_id: string;
  first_name: string;
  last_name: string;
  city: string;
  country: string;
  pathway_code: string;
  short_bio: string;
  skills: string[];
  languages: string[];
  availability: AlumniAvailability;
  portfolio_title: string;
  portfolio_url: string | null;
  portfolio_image: string | null;
  personal_website: string | null;
  linkedin_url: string | null;
  has_video: boolean;
  private_notification_email: string;
  consent_to_publish: boolean;
  consent_to_show_photo: boolean;
  is_active: boolean;
}

export interface SeedTeamMember {
  business_id: string;
  first_name: string;
  last_name: string;
  job_title: string;
  short_bio: string;
  linkedin_url: string | null;
  role_mailbox: string;
  contact_topic: string;
  display_email_publicly: boolean;
}

export interface SeedPartner {
  business_id: string;
  organisation: string;
  type: PartnerType;
  country: string;
  description: string;
  website: string | null;
  logo_key: string | null;
  show_on_site: boolean;
  status: string;
}

export const DATA_REFERENCE_DATE = '31 October 2026';
export const BASELINE_EMPLOYER_PARTNERS = 27;

export const INITIAL_LOCATIONS: LocationImpact[] = [
  {
    business_id: 'LOC-01',
    city: 'Nairobi',
    country: 'Kenya',
    latitude: -1.2921,
    longitude: 36.8219,
    learners_trained: 310,
    graduates: 242,
    employed_or_freelancing: 155,
    women_pct: 56,
    cohorts_completed: 5,
  },
  {
    business_id: 'LOC-02',
    city: 'Kampala',
    country: 'Uganda',
    latitude: 0.3476,
    longitude: 32.5825,
    learners_trained: 205,
    graduates: 160,
    employed_or_freelancing: 93,
    women_pct: 55,
    cohorts_completed: 3,
  },
  {
    business_id: 'LOC-03',
    city: 'Lagos',
    country: 'Nigeria',
    latitude: 6.5244,
    longitude: 3.3792,
    learners_trained: 240,
    graduates: 187,
    employed_or_freelancing: 112,
    women_pct: 52,
    cohorts_completed: 4,
  },
  {
    business_id: 'LOC-04',
    city: 'Accra',
    country: 'Ghana',
    latitude: 5.6037,
    longitude: -0.187,
    learners_trained: 160,
    graduates: 125,
    employed_or_freelancing: 71,
    women_pct: 54,
    cohorts_completed: 2,
  },
  {
    business_id: 'LOC-05',
    city: 'Kigali',
    country: 'Rwanda',
    latitude: -1.9441,
    longitude: 30.0619,
    learners_trained: 120,
    graduates: 94,
    employed_or_freelancing: 62,
    women_pct: 58,
    cohorts_completed: 2,
  },
  {
    business_id: 'LOC-06',
    city: 'Dakar',
    country: 'Senegal',
    latitude: 14.7167,
    longitude: -17.4677,
    learners_trained: 95,
    graduates: 74,
    employed_or_freelancing: 38,
    women_pct: 50,
    cohorts_completed: 1,
  },
  {
    business_id: 'LOC-07',
    city: 'Dar es Salaam',
    country: 'Tanzania',
    latitude: -6.7924,
    longitude: 39.2083,
    learners_trained: 118,
    graduates: 90,
    employed_or_freelancing: 53,
    women_pct: 53,
    cohorts_completed: 1,
  },
];

// Exact 11 Digi Pass Career Pathways aligned with impact_by_pathway dataset
export const PATHWAYS: PathwayInfo[] = [
  {
    code: 'P1',
    name: 'Digital Marketing & Social Media',
    description:
      'Plan multi-channel digital campaigns, manage brand calendars, track engagement analytics, and grow online audiences for African and international businesses.',
    status: 'Available',
    learners_enrolled: 96,
    completed: 81,
    freelancing_active: 52,
    avg_days_to_first_gig: 21,
  },
  {
    code: 'P2',
    name: 'Graphic Design & Visual Content Creation',
    description:
      'Create visual brand systems, social media creative kits, presentation decks, and publication layouts for studios, NGOs, and SMEs.',
    status: 'Available',
    learners_enrolled: 88,
    completed: 74,
    freelancing_active: 49,
    avg_days_to_first_gig: 18,
  },
  {
    code: 'P3',
    name: 'Customer Service & Virtual Assistance',
    description:
      'Deliver structured omnichannel customer care, SLA ticket triage, calendar coordination, and remote executive operations support.',
    status: 'Available',
    learners_enrolled: 82,
    completed: 70,
    freelancing_active: 47,
    avg_days_to_first_gig: 15,
  },
  {
    code: 'P4',
    name: 'Annotation & AI Support Services',
    description:
      'Execute quality-assured image, text, and audio data annotation, taxonomy classification, and AI response verification for distributed teams.',
    status: 'Available',
    learners_enrolled: 54,
    completed: 46,
    freelancing_active: 28,
    avg_days_to_first_gig: 24,
  },
  {
    code: 'P5',
    name: 'Translation & Localization',
    description:
      'Provide accurate bilingual localization, cultural adaptation, proofreading, and editorial support across English, French, and regional languages.',
    status: 'Available',
    learners_enrolled: 40,
    completed: 35,
    freelancing_active: 22,
    avg_days_to_first_gig: 19,
  },
  {
    code: 'P6',
    name: 'Data Entry & Data/Market Research Services',
    description:
      'Collect, clean, validate, and structure operational spreadsheets, competitor intelligence, and market research datasets.',
    status: 'Available',
    learners_enrolled: 70,
    completed: 61,
    freelancing_active: 41,
    avg_days_to_first_gig: 17,
  },
  {
    code: 'P7',
    name: 'Sales & Lead Generation',
    description:
      'Build qualified B2B prospect pipelines, manage CRM outreach workflows, and support remote revenue teams with structured follow-ups.',
    status: 'Available',
    learners_enrolled: 58,
    completed: 47,
    freelancing_active: 30,
    avg_days_to_first_gig: 26,
  },
  {
    code: 'P8',
    name: 'App & Software Assistance (AI-based)',
    description:
      'Support software testing, no-code product workflows using Airtable and Glide, user documentation, and AI-assisted application troubleshooting.',
    status: 'Available',
    learners_enrolled: 66,
    completed: 55,
    freelancing_active: 36,
    avg_days_to_first_gig: 22,
  },
  {
    code: 'P9',
    name: 'Cybersecurity Basics',
    description:
      'Apply endpoint hygiene, phishing detection, access-control monitoring, and foundational incident readiness for remote organisations.',
    status: 'Completed',
    learners_enrolled: 34,
    completed: 29,
    freelancing_active: 14,
    avg_days_to_first_gig: 31,
  },
  {
    code: 'P10',
    name: 'Cloud Solutions Specialist',
    description:
      'Configure cloud productivity workspaces, permissions, storage governance, and foundational cloud service operations.',
    status: 'Completed',
    learners_enrolled: 28,
    completed: 22,
    freelancing_active: 11,
    avg_days_to_first_gig: 35,
  },
  {
    code: 'P11',
    name: 'Mobile App Marketing',
    description:
      'Drive mobile product discovery through app store optimization, onboarding funnels, retention analytics, and launch campaigns.',
    status: 'Completed',
    learners_enrolled: 36,
    completed: 30,
    freelancing_active: 19,
    avg_days_to_first_gig: 28,
  },
];

export const COURSE_MODULES: CourseModule[] = [
  {
    part: 'Part I — Core Foundations',
    code: 'M0',
    title: 'Introduction to Part I',
    duration: '1 week',
    submodules: [
      'Digi Pass onboarding, expectations & workplace readiness',
      'Hybrid delivery tools and WhatsApp chatbot companion setup',
      'Goal setting and pathway orientation across Part II tracks',
    ],
  },
  {
    part: 'Part I — Core Foundations',
    code: 'M1',
    title: 'Advanced Digital Literacy',
    duration: '2-3 weeks',
    submodules: [
      'Writing & Formatting',
      'Spreadsheets & structured tables (Airtable & Excel/Sheets)',
      'Design & Creative Tools (Canva & Adobe workflows)',
      'Digital Communication & Google Workspace collaboration',
    ],
  },
  {
    part: 'Part I — Core Foundations',
    code: 'M2',
    title: 'Soft Skills & Advanced Writing',
    duration: '2-3 weeks',
    submodules: [
      'Communication & client etiquette',
      'Teamwork & Collaboration',
      'Cognitive Skills & critical thinking',
      'EPOCH Framework (Empathy, Perspective, Openness, Curiosity, Humility)',
      'Advanced Writing for workplace briefs',
    ],
  },
  {
    part: 'Part I — Core Foundations',
    code: 'M3',
    title: 'Understanding & Implementing AI',
    duration: '2-3 weeks',
    submodules: [
      'Intro to AI & Ethics',
      'AI in Practice',
      'Prompt Engineering & Fact Checking',
      'Common AI Tools',
      'Configuring GPT models',
      'Hybrid human-AI problem solving',
      'AI Agent development',
    ],
  },
  {
    part: 'Part I — Core Foundations',
    code: 'M4',
    title: 'Introduction to Freelancing & BPO',
    duration: '2-3 weeks',
    submodules: [
      'Platform Setup',
      'Professional Branding',
      'Proposal Writing',
      'Psychological burnout risks & sustainable work habits',
      'Networking & mentorship',
      'Intro to BPOs & remote team structures',
    ],
  },
  {
    part: 'Part I — Core Foundations',
    code: 'M5',
    title: 'Workflow Automation & Integration',
    duration: '2-3 weeks',
    submodules: [
      'Principles of Automation',
      'Tools (Zapier, Make, AI automations)',
      'Team Automation Project',
    ],
  },
];

export const YEARLY_IMPACT: YearlyImpact[] = [
  {
    year: 2022,
    is_ytd: false,
    learners_trained: 90,
    graduates: 66,
    employed_or_freelancing_pct: 55,
    women_pct: 50,
    countries_active: 2,
    cohorts_completed: 1,
    employer_partners_cumulative: 3,
    note: 'Foundational East Africa launch cohort',
  },
  {
    year: 2023,
    is_ytd: false,
    learners_trained: 210,
    graduates: 160,
    employed_or_freelancing_pct: 58,
    women_pct: 52,
    countries_active: 4,
    cohorts_completed: 3,
    employer_partners_cumulative: 8,
    note: 'Expanded regional hubs and remote freelancing track',
  },
  {
    year: 2024,
    is_ytd: false,
    learners_trained: 300,
    graduates: 234,
    employed_or_freelancing_pct: 61,
    women_pct: 53,
    countries_active: 5,
    cohorts_completed: 4,
    employer_partners_cumulative: 15,
    note: 'Full Digi Pass curriculum scaled across five countries',
  },
  {
    year: 2025,
    is_ytd: false,
    learners_trained: 360,
    graduates: 288,
    employed_or_freelancing_pct: 63,
    women_pct: 55,
    countries_active: 6,
    cohorts_completed: 5,
    employer_partners_cumulative: 22,
    note: 'Hybrid WhatsApp support, AI skills in Part I & 11 Part II pathways',
  },
  {
    year: 2026,
    is_ytd: true,
    learners_trained: 288,
    graduates: 224,
    employed_or_freelancing_pct: 60,
    women_pct: 54,
    countries_active: 7,
    cohorts_completed: 5,
    employer_partners_cumulative: 27,
    note: 'Year to date (31 Oct 2026)',
  },
];

export const ANNUAL_REPORTS: AnnualReport[] = [
  {
    year: 2024,
    title: 'Konexio Africa Annual Report 2024',
    vision_statement: 'Every learner gets a fair path to online work.',
    highlights: [
      '300 learners trained across 5 countries and 4 completed cohorts',
      '234 graduates achieving a 78% graduation rate',
      '61% employed or freelancing six months after graduation',
      '15 cumulative employer partners hiring Digi Pass graduates',
    ],
    pdf_url: '/assets/aistudio/annual_report_2024_SAMPLE_b1fa3421.pdf',
    learners_trained: 300,
    graduates: 234,
    graduation_rate_pct: 78,
    employed_or_freelancing_pct: 61,
    women_pct: 53,
    countries: 5,
    cohorts: 4,
    employer_partners: 15,
  },
  {
    year: 2025,
    title: 'Konexio Africa Annual Report 2025',
    vision_statement: 'A digital career for every motivated learner, wherever they start.',
    director_message:
      'In 2025, 360 learners joined Konexio Africa programmes across six countries. Most of our graduates now earn through freelance or remote work, and more than half of our learners are women.',
    highlights: [
      'Launched hybrid delivery with WhatsApp chatbot support for continuous learner engagement.',
      'Introduced AI-enabled skills across the Part I curriculum.',
      'Opened Part II pathways in 11 freelancing fields.',
    ],
    pdf_url: '/assets/aistudio/annual_report_2025_SAMPLE_212ab2b5.pdf',
    learners_trained: 360,
    graduates: 288,
    graduation_rate_pct: 80,
    employed_or_freelancing_pct: 63,
    women_pct: 55,
    countries: 6,
    cohorts: 5,
    employer_partners: 22,
  },
];

// 20 Alumni records with strict consent controls:
// - ALU-14 (Halima Juma) has consent_to_publish = false (excluded from all public endpoints)
// - ALU-19 (Ibrahima Ndiaye) has consent_to_publish = true, consent_to_show_photo = false (text-only profile)
export const INITIAL_ALUMNI: SeedAlumnus[] = [
  {
    business_id: 'ALU-01',
    first_name: 'Amina',
    last_name: 'Wanjiru',
    city: 'Nairobi',
    country: 'Kenya',
    pathway_code: 'P1',
    short_bio:
      "Amina plans and runs social media campaigns for small businesses across East Africa. She grew one client's Instagram following from 800 to 6,000 in four months.",
    skills: ['Content planning', 'Meta Ads', 'Canva'],
    languages: ['English', 'Swahili'],
    availability: 'Available for freelance work',
    portfolio_title: 'Campaign case study: Fresh Market Co.',
    portfolio_url: 'https://example.com/portfolio/amina-wanjiru',
    portfolio_image: '/assets/aistudio/portfolio_01_amina-wanjiru_38abf414.png',
    personal_website: 'https://example.com/amina-wanjiru',
    linkedin_url: 'https://www.linkedin.com/in/amina-wanjiru',
    has_video: true,
    private_notification_email: 'alumni01@konexio-africa.invalid',
    consent_to_publish: true,
    consent_to_show_photo: true,
    is_active: true,
  },
  {
    business_id: 'ALU-02',
    first_name: 'Joseph',
    last_name: 'Okello',
    city: 'Kampala',
    country: 'Uganda',
    pathway_code: 'P8',
    short_bio:
      'Joseph builds Airtable and Glide apps that help local shops track stock and sales. He freelances with two international clients.',
    skills: ['Airtable', 'Glide', 'Zapier'],
    languages: ['English', 'Luganda'],
    availability: 'Available part-time',
    portfolio_title: 'Inventory tracker app for a retail shop',
    portfolio_url: 'https://example.com/portfolio/joseph-okello',
    portfolio_image: '/assets/aistudio/portfolio_02_joseph-okello_d11c5722.png',
    personal_website: null,
    linkedin_url: 'https://www.linkedin.com/in/joseph-okello',
    has_video: false,
    private_notification_email: 'alumni02@konexio-africa.invalid',
    consent_to_publish: true,
    consent_to_show_photo: true,
    is_active: true,
  },
  {
    business_id: 'ALU-03',
    first_name: 'Chiamaka',
    last_name: 'Eze',
    city: 'Lagos',
    country: 'Nigeria',
    pathway_code: 'P2',
    short_bio:
      'Chiamaka designs logos and brand kits for startups, with a focus on bold colour and clear storytelling.',
    skills: ['Branding', 'Canva', 'Adobe Illustrator'],
    languages: ['English', 'Igbo'],
    availability: 'Available for freelance work',
    portfolio_title: 'Brand kit: Green Basket Foodstuff',
    portfolio_url: 'https://example.com/portfolio/chiamaka-eze',
    portfolio_image: '/assets/aistudio/portfolio_03_chiamaka-eze_fc3a98c1.png',
    personal_website: 'https://example.com/chiamaka-eze',
    linkedin_url: 'https://www.linkedin.com/in/chiamaka-eze',
    has_video: true,
    private_notification_email: 'alumni03@konexio-africa.invalid',
    consent_to_publish: true,
    consent_to_show_photo: true,
    is_active: true,
  },
  {
    business_id: 'ALU-04',
    first_name: 'Kwame',
    last_name: 'Mensah',
    city: 'Accra',
    country: 'Ghana',
    pathway_code: 'P6',
    short_bio:
      'Kwame cleans, verifies and organises datasets for market research teams, and is known for his careful quality checks.',
    skills: ['Spreadsheets', 'Data verification', 'Online research'],
    languages: ['English', 'Twi'],
    availability: 'Open to full-time roles',
    portfolio_title: 'Market research summary: mobile money use',
    portfolio_url: 'https://example.com/portfolio/kwame-mensah',
    portfolio_image: '/assets/aistudio/portfolio_04_kwame-mensah_6bcffc6b.png',
    personal_website: null,
    linkedin_url: 'https://www.linkedin.com/in/kwame-mensah',
    has_video: false,
    private_notification_email: 'alumni04@konexio-africa.invalid',
    consent_to_publish: true,
    consent_to_show_photo: true,
    is_active: true,
  },
  {
    business_id: 'ALU-05',
    first_name: 'Aline',
    last_name: 'Uwase',
    city: 'Kigali',
    country: 'Rwanda',
    pathway_code: 'P3',
    short_bio:
      'Aline provides customer support and virtual assistance for e-commerce brands in English and French.',
    skills: ['CRM tools', 'Email support', 'Scheduling'],
    languages: ['French', 'English', 'Kinyarwanda'],
    availability: 'Available for freelance work',
    portfolio_title: 'Support playbook for an online shop',
    portfolio_url: 'https://example.com/portfolio/aline-uwase',
    portfolio_image: '/assets/aistudio/portfolio_05_aline-uwase_ac03ca3d.png',
    personal_website: 'https://example.com/aline-uwase',
    linkedin_url: 'https://www.linkedin.com/in/aline-uwase',
    has_video: false,
    private_notification_email: 'alumni05@konexio-africa.invalid',
    consent_to_publish: true,
    consent_to_show_photo: true,
    is_active: true,
  },
  {
    business_id: 'ALU-06',
    first_name: 'Moussa',
    last_name: 'Diallo',
    city: 'Dakar',
    country: 'Senegal',
    pathway_code: 'P9',
    short_bio:
      'Moussa helps small organisations adopt safe passwords, two-factor authentication and everyday data-protection habits.',
    skills: ['Security awareness', 'Risk checklists', 'Privacy basics'],
    languages: ['French', 'Wolof', 'English'],
    availability: 'Available part-time',
    portfolio_title: 'Security starter guide for small NGOs',
    portfolio_url: 'https://example.com/portfolio/moussa-diallo',
    portfolio_image: '/assets/aistudio/portfolio_06_moussa-diallo_01421b55.png',
    personal_website: null,
    linkedin_url: 'https://www.linkedin.com/in/moussa-diallo',
    has_video: false,
    private_notification_email: 'alumni06@konexio-africa.invalid',
    consent_to_publish: true,
    consent_to_show_photo: true,
    is_active: true,
  },
  {
    business_id: 'ALU-07',
    first_name: 'Neema',
    last_name: 'Mushi',
    city: 'Dar es Salaam',
    country: 'Tanzania',
    pathway_code: 'P5',
    short_bio:
      'Neema translates and localises content between English and Swahili for NGOs and mobile apps.',
    skills: ['Translation', 'Localisation', 'Proofreading'],
    languages: ['Swahili', 'English'],
    availability: 'Available for freelance work',
    portfolio_title: 'Localisation case study: health app onboarding',
    portfolio_url: 'https://example.com/portfolio/neema-mushi',
    portfolio_image: '/assets/aistudio/portfolio_07_neema-mushi_13237f05.png',
    personal_website: 'https://example.com/neema-mushi',
    linkedin_url: 'https://www.linkedin.com/in/neema-mushi',
    has_video: true,
    private_notification_email: 'alumni07@konexio-africa.invalid',
    consent_to_publish: true,
    consent_to_show_photo: true,
    is_active: true,
  },
  {
    business_id: 'ALU-08',
    first_name: 'Brian',
    last_name: 'Kiprop',
    city: 'Nairobi',
    country: 'Kenya',
    pathway_code: 'P7',
    short_bio:
      'Brian researches prospects and writes outreach emails that get replies. He has booked over 40 discovery calls for remote clients.',
    skills: ['Prospecting', 'Cold email', 'HubSpot'],
    languages: ['English', 'Swahili'],
    availability: 'Available for freelance work',
    portfolio_title: 'Outreach sequence and results report',
    portfolio_url: 'https://example.com/portfolio/brian-kiprop',
    portfolio_image: '/assets/aistudio/portfolio_08_brian-kiprop_de1a7f43.png',
    personal_website: null,
    linkedin_url: 'https://www.linkedin.com/in/brian-kiprop',
    has_video: false,
    private_notification_email: 'alumni08@konexio-africa.invalid',
    consent_to_publish: true,
    consent_to_show_photo: true,
    is_active: true,
  },
  {
    business_id: 'ALU-09',
    first_name: 'Grace',
    last_name: 'Nakato',
    city: 'Kampala',
    country: 'Uganda',
    pathway_code: 'P4',
    short_bio:
      'Grace labels image and text data for AI projects with high accuracy and a sharp eye for edge cases.',
    skills: ['Data labelling', 'Quality review', 'Annotation tools'],
    languages: ['English', 'Luganda'],
    availability: 'Available part-time',
    portfolio_title: 'Annotation quality report',
    portfolio_url: 'https://example.com/portfolio/grace-nakato',
    portfolio_image: '/assets/aistudio/portfolio_09_grace-nakato_62f465b7.png',
    personal_website: 'https://example.com/grace-nakato',
    linkedin_url: 'https://www.linkedin.com/in/grace-nakato',
    has_video: false,
    private_notification_email: 'alumni09@konexio-africa.invalid',
    consent_to_publish: true,
    consent_to_show_photo: true,
    is_active: true,
  },
  {
    business_id: 'ALU-10',
    first_name: 'Tunde',
    last_name: 'Adeyemi',
    city: 'Lagos',
    country: 'Nigeria',
    pathway_code: 'P10',
    short_bio:
      'Tunde sets up and monitors cloud resources for small teams and is working toward a cloud certification.',
    skills: ['Cloud basics', 'Access control', 'Cost monitoring'],
    languages: ['English', 'Yoruba'],
    availability: 'Open to full-time roles',
    portfolio_title: 'Cloud setup walkthrough for a 5-person team',
    portfolio_url: 'https://example.com/portfolio/tunde-adeyemi',
    portfolio_image: '/assets/aistudio/portfolio_10_tunde-adeyemi_cef1b920.png',
    personal_website: null,
    linkedin_url: 'https://www.linkedin.com/in/tunde-adeyemi',
    has_video: false,
    private_notification_email: 'alumni10@konexio-africa.invalid',
    consent_to_publish: true,
    consent_to_show_photo: true,
    is_active: true,
  },
  {
    business_id: 'ALU-11',
    first_name: 'Esi',
    last_name: 'Boateng',
    city: 'Accra',
    country: 'Ghana',
    pathway_code: 'P11',
    short_bio:
      'Esi plans app store listings and launch campaigns for mobile apps aimed at West African users.',
    skills: ['ASO', 'Launch campaigns', 'Analytics'],
    languages: ['English', 'Twi'],
    availability: 'Available for freelance work',
    portfolio_title: 'App launch plan: budgeting app',
    portfolio_url: 'https://example.com/portfolio/esi-boateng',
    portfolio_image: '/assets/aistudio/portfolio_11_esi-boateng_12c262b2.png',
    personal_website: 'https://example.com/esi-boateng',
    linkedin_url: 'https://www.linkedin.com/in/esi-boateng',
    has_video: true,
    private_notification_email: 'alumni11@konexio-africa.invalid',
    consent_to_publish: true,
    consent_to_show_photo: true,
    is_active: true,
  },
  {
    business_id: 'ALU-12',
    first_name: 'Jean-Claude',
    last_name: 'Habimana',
    city: 'Kigali',
    country: 'Rwanda',
    pathway_code: 'P8',
    short_bio:
      'Jean-Claude builds internal tools with Notion and Airtable and supports SaaS users with clear troubleshooting guides.',
    skills: ['Notion', 'Airtable', 'Troubleshooting'],
    languages: ['Kinyarwanda', 'French', 'English'],
    availability: 'Available part-time',
    portfolio_title: 'Team workspace in Notion',
    portfolio_url: 'https://example.com/portfolio/jean-claude-habimana',
    portfolio_image: '/assets/aistudio/portfolio_12_jean-claude-habimana_50d80278.png',
    personal_website: null,
    linkedin_url: 'https://www.linkedin.com/in/jean-claude-habimana',
    has_video: false,
    private_notification_email: 'alumni12@konexio-africa.invalid',
    consent_to_publish: true,
    consent_to_show_photo: true,
    is_active: true,
  },
  {
    business_id: 'ALU-13',
    first_name: 'Fatou',
    last_name: 'Sow',
    city: 'Dakar',
    country: 'Senegal',
    pathway_code: 'P1',
    short_bio:
      'Fatou manages community and content for lifestyle brands, working in French and English.',
    skills: ['Community management', 'Content calendars', 'LinkedIn'],
    languages: ['French', 'English', 'Wolof'],
    availability: 'Available for freelance work',
    portfolio_title: 'Content calendar for a cosmetics brand',
    portfolio_url: 'https://example.com/portfolio/fatou-sow',
    portfolio_image: '/assets/aistudio/portfolio_13_fatou-sow_de6712fa.png',
    personal_website: 'https://example.com/fatou-sow',
    linkedin_url: 'https://www.linkedin.com/in/fatou-sow',
    has_video: true,
    private_notification_email: 'alumni13@konexio-africa.invalid',
    consent_to_publish: true,
    consent_to_show_photo: true,
    is_active: true,
  },
  {
    // NON-CONSENTING RECORD: MUST NEVER BE EXPOSED PUBLICLY
    business_id: 'ALU-14',
    first_name: 'Halima',
    last_name: 'Juma',
    city: 'Dar es Salaam',
    country: 'Tanzania',
    pathway_code: 'P2',
    short_bio: 'Halima designs social media graphics and posters for community events.',
    skills: ['Posters', 'Social graphics', 'Canva'],
    languages: ['Swahili', 'English'],
    availability: 'Available for freelance work',
    portfolio_title: 'Poster series for a community event',
    portfolio_url: null,
    portfolio_image: '/assets/aistudio/portfolio_14_halima-juma_25408528.png',
    personal_website: null,
    linkedin_url: null,
    has_video: false,
    private_notification_email: 'alumni14@konexio-africa.invalid',
    consent_to_publish: false,
    consent_to_show_photo: false,
    is_active: true,
  },
  {
    business_id: 'ALU-15',
    first_name: 'Peter',
    last_name: 'Otieno',
    city: 'Nairobi',
    country: 'Kenya',
    pathway_code: 'P6',
    short_bio:
      'Peter turns raw data into clear market research summaries and simple dashboards.',
    skills: ['Research', 'Reporting', 'Dashboards'],
    languages: ['English', 'Swahili'],
    availability: 'Open to full-time roles',
    portfolio_title: 'Market snapshot: ride-hailing in East Africa',
    portfolio_url: 'https://example.com/portfolio/peter-otieno',
    portfolio_image: '/assets/aistudio/portfolio_15_peter-otieno_581e9599.png',
    personal_website: 'https://example.com/peter-otieno',
    linkedin_url: 'https://www.linkedin.com/in/peter-otieno',
    has_video: false,
    private_notification_email: 'alumni15@konexio-africa.invalid',
    consent_to_publish: true,
    consent_to_show_photo: true,
    is_active: true,
  },
  {
    business_id: 'ALU-16',
    first_name: 'Zainab',
    last_name: 'Bello',
    city: 'Lagos',
    country: 'Nigeria',
    pathway_code: 'P3',
    short_bio: 'Zainab manages calendars, inboxes and travel planning for busy founders.',
    skills: ['Scheduling', 'Inbox management', 'Customer care'],
    languages: ['English', 'Hausa'],
    availability: 'Available for freelance work',
    portfolio_title: 'Virtual assistant toolkit',
    portfolio_url: 'https://example.com/portfolio/zainab-bello',
    portfolio_image: '/assets/aistudio/portfolio_16_zainab-bello_3b195fce.png',
    personal_website: null,
    linkedin_url: 'https://www.linkedin.com/in/zainab-bello',
    has_video: false,
    private_notification_email: 'alumni16@konexio-africa.invalid',
    consent_to_publish: true,
    consent_to_show_photo: true,
    is_active: true,
  },
  {
    business_id: 'ALU-17',
    first_name: 'Samuel',
    last_name: 'Asante',
    city: 'Accra',
    country: 'Ghana',
    pathway_code: 'P7',
    short_bio:
      'Samuel builds lead lists and manages sales pipelines in a CRM for small B2B companies.',
    skills: ['Lead lists', 'CRM', 'Reporting'],
    languages: ['English', 'Twi'],
    availability: 'Available part-time',
    portfolio_title: 'Pipeline dashboard showcase',
    portfolio_url: 'https://example.com/portfolio/samuel-asante',
    portfolio_image: '/assets/aistudio/portfolio_17_samuel-asante_68a64a9b.png',
    personal_website: 'https://example.com/samuel-asante',
    linkedin_url: 'https://www.linkedin.com/in/samuel-asante',
    has_video: false,
    private_notification_email: 'alumni17@konexio-africa.invalid',
    consent_to_publish: true,
    consent_to_show_photo: true,
    is_active: true,
  },
  {
    business_id: 'ALU-18',
    first_name: 'Diane',
    last_name: 'Ingabire',
    city: 'Kigali',
    country: 'Rwanda',
    pathway_code: 'P5',
    short_bio:
      'Diane translates between French, English and Kinyarwanda and reviews content for cultural fit.',
    skills: ['Translation', 'Cultural review', 'CAT tools'],
    languages: ['Kinyarwanda', 'French', 'English'],
    availability: 'Available for freelance work',
    portfolio_title: 'Three-language style guide',
    portfolio_url: 'https://example.com/portfolio/diane-ingabire',
    portfolio_image: '/assets/aistudio/portfolio_18_diane-ingabire_1a93d4e3.png',
    personal_website: null,
    linkedin_url: 'https://www.linkedin.com/in/diane-ingabire',
    has_video: true,
    private_notification_email: 'alumni18@konexio-africa.invalid',
    consent_to_publish: true,
    consent_to_show_photo: true,
    is_active: true,
  },
  {
    // CONSENT TO PUBLISH = TRUE, CONSENT TO SHOW PHOTO = FALSE (No photo/portfolio image/video displayed)
    business_id: 'ALU-19',
    first_name: 'Ibrahima',
    last_name: 'Ndiaye',
    city: 'Dakar',
    country: 'Senegal',
    pathway_code: 'P4',
    short_bio:
      'Ibrahima labels text and audio data for AI projects with rigorous quality assurance across bilingual datasets.',
    skills: ['Text annotation', 'Audio labelling', 'QA'],
    languages: ['French', 'Wolof', 'English'],
    availability: 'Available part-time',
    portfolio_title: 'Audio labelling guidelines',
    portfolio_url: 'https://example.com/portfolio/ibrahima-ndiaye',
    portfolio_image: '/assets/aistudio/portfolio_19_ibrahima-ndiaye_5021cfea.png',
    personal_website: 'https://example.com/ibrahima-ndiaye',
    linkedin_url: 'https://www.linkedin.com/in/ibrahima-ndiaye',
    has_video: false,
    private_notification_email: 'alumni19@konexio-africa.invalid',
    consent_to_publish: true,
    consent_to_show_photo: false,
    is_active: true,
  },
  {
    business_id: 'ALU-20',
    first_name: 'Rose',
    last_name: 'Atim',
    city: 'Kampala',
    country: 'Uganda',
    pathway_code: 'P1',
    short_bio: 'Rose creates newsletters and social content for education non-profits.',
    skills: ['Newsletters', 'Social media', 'Storytelling'],
    languages: ['English', 'Luo'],
    availability: 'Available for freelance work',
    portfolio_title: 'Newsletter series for a school charity',
    portfolio_url: 'https://example.com/portfolio/rose-atim',
    portfolio_image: '/assets/aistudio/portfolio_20_rose-atim_89808c92.png',
    personal_website: null,
    linkedin_url: 'https://www.linkedin.com/in/rose-atim',
    has_video: true,
    private_notification_email: 'alumni20@konexio-africa.invalid',
    consent_to_publish: true,
    consent_to_show_photo: true,
    is_active: true,
  },
];

// 8 Team members (display_email_publicly = false for all 8; role_mailbox NEVER exposed publicly)
export const INITIAL_TEAM: SeedTeamMember[] = [
  {
    business_id: 'TEAM-01',
    first_name: 'Naledi',
    last_name: 'Dube',
    job_title: 'Country Director',
    short_bio: "Leads Konexio Africa's strategy and partnerships across the region.",
    linkedin_url: 'https://www.linkedin.com/in/naledi-dube',
    role_mailbox: 'director@konexio-africa.invalid',
    contact_topic: 'Press and general',
    display_email_publicly: false,
  },
  {
    business_id: 'TEAM-02',
    first_name: 'Kofi',
    last_name: 'Boakye',
    job_title: 'Programmes Manager',
    short_bio: 'Oversees training delivery, cohorts and learner outcomes.',
    linkedin_url: 'https://www.linkedin.com/in/kofi-boakye',
    role_mailbox: 'programmes@konexio-africa.invalid',
    contact_topic: 'Training and programmes',
    display_email_publicly: false,
  },
  {
    business_id: 'TEAM-03',
    first_name: 'Wanjiku',
    last_name: 'Mwangi',
    job_title: 'Lead Trainer',
    short_bio: 'Trains and coaches facilitators in the Digi Pass programme.',
    linkedin_url: 'https://www.linkedin.com/in/wanjiku-mwangi',
    role_mailbox: 'trainers@konexio-africa.invalid',
    contact_topic: 'Training and programmes',
    display_email_publicly: false,
  },
  {
    business_id: 'TEAM-04',
    first_name: 'Ousmane',
    last_name: 'Ba',
    job_title: 'Partnerships Lead',
    short_bio: 'Builds relationships with employers, donors and training partners.',
    linkedin_url: 'https://www.linkedin.com/in/ousmane-ba',
    role_mailbox: 'partnerships@konexio-africa.invalid',
    contact_topic: 'Partnerships, funding, hiring',
    display_email_publicly: false,
  },
  {
    business_id: 'TEAM-05',
    first_name: 'Imani',
    last_name: 'Kessy',
    job_title: 'Alumni Community Manager',
    short_bio: 'Connects alumni with clients and organises mentorship and webinars.',
    linkedin_url: 'https://www.linkedin.com/in/imani-kessy',
    role_mailbox: 'alumni@konexio-africa.invalid',
    contact_topic: 'Alumni community',
    display_email_publicly: false,
  },
  {
    business_id: 'TEAM-06',
    first_name: 'Chidi',
    last_name: 'Okafor',
    job_title: 'Monitoring, Evaluation & Learning Officer',
    short_bio: 'Collects and reports impact data for partners and annual reports.',
    linkedin_url: 'https://www.linkedin.com/in/chidi-okafor',
    role_mailbox: 'impact@konexio-africa.invalid',
    contact_topic: 'Press and general',
    display_email_publicly: false,
  },
  {
    business_id: 'TEAM-07',
    first_name: 'Sarah',
    last_name: 'Namuli',
    job_title: 'EdTech Product Manager',
    short_bio: 'Manages the learning platform, curriculum tools and learner support.',
    linkedin_url: 'https://www.linkedin.com/in/sarah-namuli',
    role_mailbox: 'edtech@konexio-africa.invalid',
    contact_topic: 'Website or technical problem',
    display_email_publicly: false,
  },
  {
    business_id: 'TEAM-08',
    first_name: 'Yusuf',
    last_name: 'Mohamed',
    job_title: 'Operations Coordinator',
    short_bio: 'Keeps schedules, logistics and administration running smoothly.',
    linkedin_url: 'https://www.linkedin.com/in/yusuf-mohamed',
    role_mailbox: 'operations@konexio-africa.invalid',
    contact_topic: 'Press and general',
    display_email_publicly: false,
  },
];

export const INITIAL_PARTNERS: SeedPartner[] = [
  {
    business_id: 'PAR-01',
    organisation: 'Savanna Digital Works',
    type: 'Employer',
    country: 'Kenya',
    description: 'Hires freelancers for marketing and design projects.',
    website: 'https://example.com/savanna-digital-works',
    logo_key: 'partner_01',
    show_on_site: true,
    status: 'approved',
  },
  {
    business_id: 'PAR-02',
    organisation: 'BrightPath Foundation',
    type: 'Donor',
    country: 'Ghana',
    description: 'Funds digital skills training for young adults.',
    website: 'https://example.com/brightpath-foundation',
    logo_key: 'partner_02',
    show_on_site: true,
    status: 'approved',
  },
  {
    business_id: 'PAR-03',
    organisation: 'Lakeside BPO',
    type: 'Employer',
    country: 'Uganda',
    description: 'Outsourcing company hiring customer support agents.',
    website: 'https://example.com/lakeside-bpo',
    logo_key: 'partner_03',
    show_on_site: true,
    status: 'approved',
  },
  {
    business_id: 'PAR-04',
    organisation: 'Harmattan Analytics',
    type: 'Employer',
    country: 'Nigeria',
    description: 'Data and research firm hiring analysts and annotators.',
    website: 'https://example.com/harmattan-analytics',
    logo_key: 'partner_04',
    show_on_site: true,
    status: 'approved',
  },
  {
    business_id: 'PAR-05',
    organisation: 'Kilimanjaro Creative Studio',
    type: 'Client',
    country: 'Tanzania',
    description: 'Design studio that outsources graphic work.',
    website: 'https://example.com/kilimanjaro-creative-studio',
    logo_key: 'partner_05',
    show_on_site: true,
    status: 'approved',
  },
  {
    business_id: 'PAR-06',
    organisation: 'OpenDoor Fund',
    type: 'Donor',
    country: 'Rwanda',
    description: 'Supports refugee and youth employment programmes.',
    website: 'https://example.com/opendoor-fund',
    logo_key: 'partner_06',
    show_on_site: true,
    status: 'approved',
  },
  {
    business_id: 'PAR-07',
    organisation: 'Baobab Tech Hub',
    type: 'Training partner',
    country: 'Senegal',
    description: 'Hosts in-person training sessions and mentoring.',
    website: 'https://example.com/baobab-tech-hub',
    logo_key: 'partner_07',
    show_on_site: true,
    status: 'approved',
  },
  {
    business_id: 'PAR-08',
    organisation: 'Nile Learning Trust',
    type: 'Donor',
    country: 'Uganda',
    description: 'Education charity funding learner devices and data.',
    website: 'https://example.com/nile-learning-trust',
    logo_key: 'partner_08',
    show_on_site: true,
    status: 'approved',
  },
  {
    business_id: 'PAR-09',
    organisation: 'Teranga Logistics',
    type: 'Employer',
    country: 'Senegal',
    description: 'Logistics company hiring virtual assistants.',
    website: 'https://example.com/teranga-logistics',
    logo_key: 'partner_09',
    show_on_site: true,
    status: 'approved',
  },
  {
    business_id: 'PAR-10',
    organisation: 'Coastline Commerce',
    type: 'Client',
    country: 'Kenya',
    description: 'E-commerce brand hiring marketing freelancers.',
    website: 'https://example.com/coastline-commerce',
    logo_key: 'partner_10',
    show_on_site: true,
    status: 'approved',
  },
];

export interface ImpactStory {
  id: string;
  title: string;
  city: string;
  quote: string;
  attribution: string;
  highlight?: string;
}

export const IMPACT_STORIES: ImpactStory[] = [
  {
    id: 'story-1',
    title: 'From job-hunting to first freelance contract',
    city: 'Nairobi',
    quote:
      'I finished Part I in March and chose digital marketing for Part II. By June I had my first paid client, a small food business that needed help with social media.',
    attribution: 'Amina Wanjiru · Digi Pass Alumna (P1)',
    highlight: '90 days from graduation to first gig · 3 active clients',
  },
  {
    id: 'story-2',
    title: 'Building tools for local shops',
    city: 'Kampala',
    quote:
      'I learned Airtable and Glide, then built a stock tracker for a shop near my home. Now I build apps for clients abroad.',
    attribution: 'Joseph Okello · Digi Pass Alumnus (P8)',
  },
  {
    id: 'story-3',
    title: 'A cohort that grew into a community',
    city: 'Kigali',
    quote:
      "The Kigali cohort began a weekly alumni check-in after graduation. Members share job leads, review each other's portfolios and invite guest speakers.",
    attribution: 'Kigali Digi Pass Cohort',
  },
];
