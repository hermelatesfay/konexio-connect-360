import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  alumniProfiles,
  annualReports,
  courseModules,
  impactStories,
  locations,
  partners,
  pathways,
  teamMembers,
  yearlyImpacts,
} from '../db/schema.ts';

export interface PublicKnowledgeItem {
  id: string;
  type: 'page' | 'pathway' | 'module' | 'alumnus' | 'partner' | 'location' | 'report' | 'story' | 'team';
  title: string;
  subtitle: string;
  summary: string;
  url: string;
  tags: string[];
}

export interface PublicKnowledgeBundle {
  items: PublicKnowledgeItem[];
  summaryContext: string;
}

const STATIC_SITE_PAGES: PublicKnowledgeItem[] = [
  {
    id: 'page-home',
    type: 'page',
    title: 'Konexio Africa — Digi Pass Home',
    subtitle: 'Overview & Mission',
    summary:
      'Konexio Africa equips young people, women, and displaced learners across seven African hubs with digital, AI, and remote work readiness training via the Digi Pass programme.',
    url: '/',
    tags: ['home', 'mission', 'digi pass', 'konexio africa', 'remote work'],
  },
  {
    id: 'page-about',
    type: 'page',
    title: 'About Konexio Africa',
    subtitle: 'Mission, Vision & EPOCH Values',
    summary:
      'Learn about Konexio Africa’s mission, vision, EPOCH values (Empathy, Perspective, Openness, Curiosity, Humility), learner journey, and consent-first privacy.',
    url: '/about',
    tags: ['about', 'mission', 'vision', 'epoch', 'values', 'journey'],
  },
  {
    id: 'page-programmes',
    type: 'page',
    title: 'Digi Pass Programmes (Part I & Part II)',
    subtitle: '6 Foundational Modules + 11 Digital Pathways',
    summary:
      'Explore Part I core digital & workplace modules (M0–M5) and Part II market-aligned pathways (P1–P11) including Digital Marketing, Graphic Design, Virtual Assistance, Data Annotation, Web & App Development, No-Code, and Cybersecurity.',
    url: '/programmes',
    tags: ['programmes', 'curriculum', 'modules', 'pathways', 'training', 'apply'],
  },
  {
    id: 'page-impact',
    type: 'page',
    title: 'Impact Dashboard & Annual Reports',
    subtitle: 'Outcomes, Hub Footprint & Sample Reports',
    summary:
      'Inspect Konexio Africa’s demonstration metrics across 7 hubs, cohort trends from 2023 to 2026 YTD, impact stories, and annual impact reports (2024 & 2025).',
    url: '/impact',
    tags: ['impact', 'metrics', 'annual report', 'pdf', 'statistics', 'hubs'],
  },
  {
    id: 'page-alumni',
    type: 'page',
    title: 'Public Alumni Talent Directory',
    subtitle: 'Consented Digi Pass Graduates',
    summary:
      'Browse consented Konexio Africa alumni profiles by pathway, country, skill, and availability. Only graduates who explicitly consent to publish appear here.',
    url: '/alumni',
    tags: ['alumni', 'talent', 'hire', 'freelancers', 'graduates', 'directory'],
  },
  {
    id: 'page-get-involved',
    type: 'page',
    title: 'Get Involved — Hire Talent, Partner or Fund',
    subtitle: 'Express Interest & Organisation Onboarding',
    summary:
      'Employers, freelance clients, training partners, and donors can express interest in hiring alumni, sponsoring cohorts, or joining the partner network.',
    url: '/get-involved',
    tags: ['get involved', 'hire', 'partner', 'donor', 'fund', 'sponsor'],
  },
  {
    id: 'page-team',
    type: 'page',
    title: 'Konexio Africa Team',
    subtitle: 'Leadership & Hub Coordinators',
    summary:
      'Meet the leadership, programmes, partnerships, and EdTech team guiding Konexio Africa across East and West Africa.',
    url: '/team',
    tags: ['team', 'staff', 'leadership', 'director'],
  },
  {
    id: 'page-contact',
    type: 'page',
    title: 'Contact Konexio Africa',
    subtitle: 'Topic-Routed Enquiries',
    summary:
      'Send an enquiry routed directly to Programmes, Partnerships, Alumni Community, EdTech Support, or the Country Director.',
    url: '/contact',
    tags: ['contact', 'email', 'message', 'support', 'enquiry'],
  },
  {
    id: 'page-signup',
    type: 'page',
    title: 'Create Account / Apply',
    subtitle: 'Learner, Alumni, Employer, Partner & Donor Registration',
    summary:
      'Sign up as a prospective learner, alumnus, employer/client, training partner, or donor to access your role-based Konexio Connect 360 dashboard.',
    url: '/signup',
    tags: ['signup', 'register', 'apply', 'account', 'join'],
  },
];

export async function getPublicKnowledgeBundle(): Promise<PublicKnowledgeBundle> {
  try {
    const [
      pathwayRows,
      moduleRows,
      alumniRows,
      partnerRows,
      locationRows,
      yearlyRows,
      reportRows,
      storyRows,
      teamRows,
    ] = await Promise.all([
      db.select().from(pathways).where(eq(pathways.isActive, true)).orderBy(asc(pathways.code)),
      db.select().from(courseModules).where(eq(courseModules.isActive, true)).orderBy(asc(courseModules.sortOrder)),
      // Strict privacy filter: ONLY consented, active, non-archived alumni; never select private emails
      db
        .select({
          businessId: alumniProfiles.businessId,
          firstName: alumniProfiles.firstName,
          lastName: alumniProfiles.lastName,
          city: alumniProfiles.city,
          country: alumniProfiles.country,
          pathwayCode: alumniProfiles.pathwayCode,
          pathwayName: alumniProfiles.pathwayName,
          skills: alumniProfiles.skills,
          languages: alumniProfiles.languages,
          availability: alumniProfiles.availability,
          shortBio: alumniProfiles.shortBio,
          portfolioTitle: alumniProfiles.portfolioTitle,
        })
        .from(alumniProfiles)
        .where(
          and(
            eq(alumniProfiles.consentToPublish, true),
            eq(alumniProfiles.isActive, true),
            isNull(alumniProfiles.archivedAt),
          ),
        )
        .orderBy(asc(alumniProfiles.businessId)),
      db
        .select({
          businessId: partners.businessId,
          organisation: partners.organisation,
          type: partners.type,
          country: partners.country,
          description: partners.description,
        })
        .from(partners)
        .where(and(eq(partners.showOnSite, true), isNull(partners.archivedAt)))
        .orderBy(asc(partners.businessId)),
      db.select().from(locations).orderBy(asc(locations.businessId)),
      db.select().from(yearlyImpacts).orderBy(asc(yearlyImpacts.year)),
      db.select().from(annualReports).orderBy(asc(annualReports.year)),
      db.select().from(impactStories).where(eq(impactStories.isPublished, true)),
      // Strict privacy filter: never expose roleMailbox
      db
        .select({
          businessId: teamMembers.businessId,
          firstName: teamMembers.firstName,
          lastName: teamMembers.lastName,
          roleTitle: teamMembers.roleTitle,
          bio: teamMembers.bio,
          contactTopic: teamMembers.contactTopic,
        })
        .from(teamMembers)
        .where(eq(teamMembers.isActive, true))
        .orderBy(asc(teamMembers.sortOrder)),
    ]);

    const items: PublicKnowledgeItem[] = [...STATIC_SITE_PAGES];

    for (const pw of pathwayRows) {
      items.push({
        id: `pathway-${pw.code}`,
        type: 'pathway',
        title: `${pw.code}: ${pw.name}`,
        subtitle: `Part II Pathway · ${pw.status}`,
        summary: `${pw.summary} (${pw.learnersCount} learners enrolled, ${pw.freelancingActive} active in work/freelancing, ~${pw.avgDaysToFirstGig} avg days to first gig).`,
        url: `/programmes`,
        tags: [pw.code.toLowerCase(), pw.name.toLowerCase(), 'pathway', 'training'],
      });
    }

    for (const mod of moduleRows) {
      items.push({
        id: `module-${mod.code}`,
        type: 'module',
        title: `${mod.code}: ${mod.title}`,
        subtitle: `${mod.part} · ${mod.duration}`,
        summary: mod.submodules.join('; '),
        url: `/programmes`,
        tags: [mod.code.toLowerCase(), mod.title.toLowerCase(), 'part i', 'module'],
      });
    }

    for (const al of alumniRows) {
      const fullName = `${al.firstName} ${al.lastName}`;
      items.push({
        id: `alumni-${al.businessId}`,
        type: 'alumnus',
        title: `${fullName} (${al.businessId})`,
        subtitle: `${al.pathwayName} · ${al.city ? `${al.city}, ` : ''}${al.country} · ${al.availability}`,
        summary: `${al.shortBio} Skills: ${al.skills.join(', ')}. Languages: ${al.languages.join(', ')}.${al.portfolioTitle ? ` Portfolio: ${al.portfolioTitle}.` : ''}`,
        url: `/alumni/${al.businessId}`,
        tags: [
          al.businessId.toLowerCase(),
          fullName.toLowerCase(),
          al.country.toLowerCase(),
          al.city.toLowerCase(),
          al.pathwayCode.toLowerCase(),
          al.pathwayName.toLowerCase(),
          ...al.skills.map((s) => s.toLowerCase()),
        ],
      });
    }

    for (const pr of partnerRows) {
      items.push({
        id: `partner-${pr.businessId}`,
        type: 'partner',
        title: pr.organisation,
        subtitle: `${pr.type} Partner · ${pr.country}`,
        summary: pr.description,
        url: '/about',
        tags: [pr.organisation.toLowerCase(), pr.type.toLowerCase(), pr.country.toLowerCase()],
      });
    }

    for (const loc of locationRows) {
      items.push({
        id: `location-${loc.businessId}`,
        type: 'location',
        title: `${loc.city}, ${loc.country} Hub`,
        subtitle: `${loc.learnersTrained} learners · ${loc.employmentRatePct}% employed/freelancing`,
        summary: `${loc.cohortsCompleted} completed cohorts, ${loc.graduates} graduates, ${loc.womenPct}% women participation (demonstration dataset).`,
        url: '/impact',
        tags: [loc.city.toLowerCase(), loc.country.toLowerCase(), 'hub', 'location'],
      });
    }

    for (const rep of reportRows) {
      items.push({
        id: `report-${rep.year}`,
        type: 'report',
        title: rep.title,
        subtitle: `Sample Annual Report (${rep.year})`,
        summary: `${rep.visionStatement} Highlights: ${rep.highlights.join(' | ')}`,
        url: '/impact',
        tags: ['annual report', String(rep.year), 'sample', 'outcomes'],
      });
    }

    for (const st of storyRows) {
      items.push({
        id: `story-${st.businessId}`,
        type: 'story',
        title: st.title,
        subtitle: `Impact Story · ${st.location}`,
        summary: `${st.quote} (${st.attribution})`,
        url: '/impact',
        tags: [st.location.toLowerCase(), st.title.toLowerCase(), 'story'],
      });
    }

    for (const tm of teamRows) {
      items.push({
        id: `team-${tm.businessId}`,
        type: 'team',
        title: `${tm.firstName} ${tm.lastName} — ${tm.roleTitle}`,
        subtitle: `Konexio Africa Team · Topic: ${tm.contactTopic}`,
        summary: tm.bio,
        url: '/team',
        tags: [tm.firstName.toLowerCase(), tm.lastName.toLowerCase(), tm.roleTitle.toLowerCase(), 'team'],
      });
    }

    const totalLearners = locationRows.reduce((s, l) => s + l.learnersTrained, 0);
    const totalGraduates = locationRows.reduce((s, l) => s + l.graduates, 0);
    const totalEmployed = locationRows.reduce((s, l) => s + l.employedOrFreelancing, 0);

    const summaryContext = [
      `ORGANISATION: Konexio Africa (Digi Pass platform).`,
      `DEMONSTRATION METRICS (as of 31 October 2026): ${totalLearners} learners trained, ${totalGraduates} graduates, ${totalEmployed} employed or freelancing across ${locationRows.length} hubs.`,
      `YEARLY PROGRESSION: ${yearlyRows.map((y) => `${y.year}${y.isYtd ? ' YTD' : ''}: ${y.learnersTrained} learners, ${y.employmentRatePct}% employed`).join('; ')}.`,
      `PRIVACY RULE: Only consented public alumni profiles are listed below. Never invent personal email addresses, phone numbers, or private records.`,
    ].join('\n');

    return { items, summaryContext };
  } catch (error) {
    console.error('Public knowledge retrieval error:', error);
    throw new Error('Failed to load public knowledge directory', { cause: error });
  }
}

export function rankPublicItems(items: PublicKnowledgeItem[], query: string, limit = 8): PublicKnowledgeItem[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  if (terms.length === 0) {
    return items.slice(0, limit);
  }

  const scored = items
    .map((item) => {
      const hay = `${item.title} ${item.subtitle} ${item.summary} ${item.tags.join(' ')}`.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (item.title.toLowerCase().includes(term)) score += 5;
        if (item.tags.some((tg) => tg.includes(term))) score += 4;
        if (item.subtitle.toLowerCase().includes(term)) score += 3;
        if (hay.includes(term)) score += 2;
      }
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((entry) => entry.item);
}
