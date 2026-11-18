export type UserRole =
  | 'learner'
  | 'alumni'
  | 'employer'
  | 'partner'
  | 'donor'
  | 'admin'
  | 'user';

export type AuthUser = {
  id: number;
  first_name: string;
  second_name: string;
  email: string;
  has_organisation: boolean;
  role: UserRole;
  pathway_code?: string | null;
  country?: string | null;
  linked_business_id?: string | null;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  first_name: string;
  second_name: string;
  email: string;
  password: string;
  has_organisation?: boolean;
  account_type: 'learner' | 'alumni' | 'employer' | 'partner' | 'donor';
  city?: string;
  country?: string;
  pathway_code?: string;
  learning_goal?: string;
  short_bio?: string;
  skills?: string[];
  languages?: string[];
  availability?: string;
  portfolio_title?: string;
  portfolio_url?: string;
  personal_website?: string;
  linkedin_url?: string;
  consent_to_publish?: boolean;
  consent_to_show_photo?: boolean;
  organisation?: string;
  partner_type?: 'Employer' | 'Client' | 'Training partner' | 'Donor';
  description?: string;
  website?: string;
  phone?: string;
};

export type AuthResponsePayload = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export interface ImpactSummary {
  learners_trained: number;
  graduates: number;
  employed_or_freelancing: number;
  employment_rate_pct: number;
  countries: number;
  cohorts_completed: number;
  women_pct: number;
  employer_partners: number;
  as_of: string;
  data_label: string;
}

export interface LocationImpact {
  business_id: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  learners_trained: number;
  graduates: number;
  employed_or_freelancing: number;
  employment_rate_pct: number;
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
  duration?: string;
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
  pdf_url?: string;
  learners_trained: number;
  graduates: number;
  graduation_rate_pct: number;
  employed_or_freelancing_pct: number;
  women_pct: number;
  countries: number;
  cohorts: number;
  employer_partners: number;
}

export interface ImpactStory {
  id: string;
  title: string;
  city: string;
  quote: string;
  attribution: string;
  highlight?: string;
}

export interface PublicAlumnus {
  business_id: string;
  first_name: string;
  last_name: string;
  initials: string;
  city: string | null;
  country: string | null;
  pathway_code: string;
  pathway_name: string;
  short_bio: string | null;
  skills: string[];
  languages: string[];
  availability: string;
  portfolio_title: string | null;
  portfolio_url: string | null;
  portfolio_image?: string | null;
  profile_link: string | null;
  personal_website: string | null;
  linkedin_url: string | null;
  consent_to_show_photo: boolean;
  has_video: boolean;
}

export interface PublicTeamMember {
  business_id: string;
  first_name: string;
  last_name: string;
  initials: string;
  job_title: string;
  short_bio: string | null;
  linkedin_url: string | null;
  contact_topic: string;
  display_email_publicly: boolean;
}

export interface PublicPartner {
  business_id: string;
  organisation: string;
  type: string;
  country: string | null;
  description: string | null;
  website: string | null;
  logo_key: string | null;
}

export interface ExpressInterestPayload {
  full_name: string;
  organisation?: string;
  email: string;
  visitor_type: 'Employer' | 'Client' | 'Donor';
  interest_type: 'alumni' | 'pathway' | 'general';
  interest_value?: string;
  message: string;
  consent_to_be_contacted: boolean;
  website_url?: string;
}

export interface ExpressInterestResponse {
  reference_id: string;
  status: string;
  expected_response_time: string;
  message: string;
}