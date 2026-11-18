import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import {
  ANNUAL_REPORTS,
  BASELINE_EMPLOYER_PARTNERS,
  COURSE_MODULES,
  DATA_REFERENCE_DATE,
  IMPACT_STORIES,
  INITIAL_ALUMNI,
  INITIAL_LOCATIONS,
  INITIAL_PARTNERS,
  INITIAL_TEAM,
  PATHWAYS,
  YEARLY_IMPACT,
} from '../../server/data.ts';
import { db } from './index.ts';
import {
  alumniProfiles,
  alumniSkills,
  annualReports,
  consentRecords,
  courseModules,
  impactStories,
  interestSubmissions,
  learnerProfiles,
  learnerProgress,
  locations,
  newsletterSubscriptions,
  notifications,
  partners,
  pathways,
  platformSettings,
  teamMembers,
  users,
  yearlyImpacts,
} from './schema.ts';

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runIdempotentSeed().catch((err) => {
      seedPromise = null;
      throw new Error('Database initialization failed', { cause: err });
    });
  }
  return seedPromise;
}

async function runIdempotentSeed(): Promise<void> {
  try {
    const [pathwayCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pathways);
    const [userCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);
    const [alumniCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(alumniProfiles);

    const hasPathways = (pathwayCountRow?.count ?? 0) > 0;
    const hasUsers = (userCountRow?.count ?? 0) > 0;
    const hasAlumni = (alumniCountRow?.count ?? 0) > 0;

    if (hasPathways && hasUsers && hasAlumni) {
      return;
    }

    const allowDemoSeed = process.env.ALLOW_DEMO_SEED !== 'false';

    await db.transaction(async (tx) => {
      if (!hasPathways) {
        for (const pw of PATHWAYS) {
          const rate =
            pw.completed > 0 ? Math.round((pw.freelancing_active / pw.completed) * 100) : 0;
          await tx
            .insert(pathways)
            .values({
              code: pw.code,
              name: pw.name,
              category: 'Digital Pathway',
              summary: pw.description,
              status: pw.status,
              targetRoles: [],
              skills: [],
              durationWeeks: 12,
              learnersCount: pw.learners_enrolled,
              completedCount: pw.completed,
              freelancingActive: pw.freelancing_active,
              avgDaysToFirstGig: pw.avg_days_to_first_gig,
              employmentRatePct: rate,
              isActive: true,
            })
            .onConflictDoNothing({ target: pathways.code });
        }

        for (let i = 0; i < COURSE_MODULES.length; i += 1) {
          const mod = COURSE_MODULES[i];
          const parsedHours = Number.parseInt(mod.duration, 10);
          await tx
            .insert(courseModules)
            .values({
              code: mod.code,
              title: mod.title,
              part: mod.part,
              duration: mod.duration,
              submodules: mod.submodules,
              summary: mod.submodules.join(' · '),
              hours: Number.isFinite(parsedHours) ? parsedHours : 4,
              sortOrder: i + 1,
              isActive: true,
            })
            .onConflictDoNothing({ target: courseModules.code });
        }

        for (const loc of INITIAL_LOCATIONS) {
          const rate =
            loc.graduates > 0 ? Math.round((loc.employed_or_freelancing / loc.graduates) * 100) : 0;
          await tx
            .insert(locations)
            .values({
              businessId: loc.business_id,
              country: loc.country,
              city: loc.city,
              latitude: loc.latitude,
              longitude: loc.longitude,
              learnersTrained: loc.learners_trained,
              graduates: loc.graduates,
              employedOrFreelancing: loc.employed_or_freelancing,
              employmentRatePct: rate,
              womenPct: loc.women_pct,
              cohortsCompleted: loc.cohorts_completed,
            })
            .onConflictDoNothing({ target: locations.businessId });
        }

        for (const yr of YEARLY_IMPACT) {
          await tx
            .insert(yearlyImpacts)
            .values({
              year: yr.year,
              isYtd: yr.is_ytd,
              learnersTrained: yr.learners_trained,
              graduates: yr.graduates,
              employmentRatePct: yr.employed_or_freelancing_pct,
              womenPct: yr.women_pct,
              countriesActive: yr.countries_active,
              cohortsCompleted: yr.cohorts_completed,
              employerPartnersCumulative: yr.employer_partners_cumulative,
              note: yr.note,
            })
            .onConflictDoNothing({ target: yearlyImpacts.year });
        }

        for (const rep of ANNUAL_REPORTS) {
          await tx
            .insert(annualReports)
            .values({
              year: rep.year,
              title: rep.title,
              filename: rep.pdf_url.split('/').pop() || `annual_report_${rep.year}_SAMPLE.pdf`,
              visionStatement: rep.vision_statement,
              directorMessage: rep.director_message ?? '',
              summary: rep.vision_statement,
              highlights: rep.highlights ?? [],
              publicUrl: rep.pdf_url,
              learnersTrained: rep.learners_trained,
              graduates: rep.graduates,
              graduationRatePct: rep.graduation_rate_pct,
              employedOrFreelancingPct: rep.employed_or_freelancing_pct,
              womenPct: rep.women_pct,
              countries: rep.countries,
              cohorts: rep.cohorts,
              employerPartners: rep.employer_partners,
              isSample: true,
            })
            .onConflictDoNothing({ target: annualReports.year });
        }

        for (const story of IMPACT_STORIES) {
          await tx
            .insert(impactStories)
            .values({
              businessId: story.id,
              title: story.title,
              location: story.city,
              pathway: story.attribution,
              quote: story.quote,
              attribution: story.attribution,
              highlight: story.highlight ?? null,
              summary: story.quote,
              outcomeMetric: story.highlight ?? 'Digi Pass outcome story',
              isSample: true,
              isPublished: true,
            })
            .onConflictDoNothing({ target: impactStories.businessId });
        }

        for (let i = 0; i < INITIAL_TEAM.length; i += 1) {
          const member = INITIAL_TEAM[i];
          const photoMap: Record<string, string> = {
            'TEAM-01': '/assets/aistudio/portfolio_01_amina-wanjiru_38abf414.png',
            'TEAM-02': '/assets/aistudio/portfolio_02_joseph-okello_d11c5722.png',
            'TEAM-03': '/assets/aistudio/portfolio_03_chiamaka-eze_fc3a98c1.png',
            'TEAM-04': '/assets/aistudio/portfolio_04_kwame-mensah_6bcffc6b.png',
            'TEAM-05': '/assets/aistudio/portfolio_05_aline-uwase_ac03ca3d.png',
            'TEAM-06': '/assets/aistudio/portfolio_06_moussa-diallo_01421b55.png',
            'TEAM-07': '/assets/aistudio/portfolio_07_neema-mushi_13237f05.png',
            'TEAM-08': '/assets/aistudio/portfolio_08_brian-kiprop_de1a7f43.png',
          };
          await tx
            .insert(teamMembers)
            .values({
              businessId: member.business_id,
              firstName: member.first_name,
              lastName: member.last_name,
              name: `${member.first_name} ${member.last_name}`,
              roleTitle: member.job_title,
              category: i < 3 ? 'Leadership' : 'Team',
              country: 'East & West Africa',
              bio: member.short_bio,
              photoUrl: photoMap[member.business_id] ?? '',
              linkedinUrl: member.linkedin_url ?? '',
              roleMailbox: member.role_mailbox,
              contactTopic: member.contact_topic,
              displayEmailPublicly: false,
              isActive: true,
              sortOrder: i + 1,
            })
            .onConflictDoNothing({ target: teamMembers.businessId });
        }

        await tx
          .insert(platformSettings)
          .values([
            { key: 'employer_partners_count', value: String(BASELINE_EMPLOYER_PARTNERS) },
            { key: 'impact_as_of', value: DATA_REFERENCE_DATE },
          ])
          .onConflictDoNothing({ target: platformSettings.key });
      }

      if (!allowDemoSeed) {
        return;
      }

      const demoPassword = process.env.DEMO_ACCOUNT_PASSWORD || 'KonexioDemo2026!';
      const adminEmail = (process.env.ADMIN_EMAIL || 'admin@konexio-demo.org').toLowerCase();
      const adminPassword = process.env.ADMIN_PASSWORD || demoPassword;

      const userIdByEmail = new Map<string, number>();

      if (!hasUsers) {
        const seedUsers = [
          {
            uid: 'seed-learner-01',
            firstName: 'Grace',
            secondName: 'Wanjiru',
            email: 'learner@konexio-demo.org',
            password: demoPassword,
            hasOrganisation: false,
            role: 'learner',
            linkedBusinessId: 'LRN-01',
            pathwayCode: 'P1',
            country: 'Kenya',
            city: 'Nairobi',
            learningGoal:
              'Complete Part I foundations and launch a portfolio in Digital Marketing.',
          },
          {
            uid: 'seed-alumni-01',
            firstName: 'Amina',
            secondName: 'Wanjiru',
            email: 'alumni@konexio-demo.org',
            password: demoPassword,
            hasOrganisation: false,
            role: 'alumni',
            linkedBusinessId: 'ALU-01',
            pathwayCode: 'P1',
            country: 'Kenya',
            city: 'Nairobi',
            learningGoal: null,
          },
          {
            uid: 'seed-employer-01',
            firstName: 'Maria',
            secondName: 'Lopez',
            email: 'employer@konexio-demo.org',
            password: demoPassword,
            hasOrganisation: true,
            organisation: 'Savanna Digital Works',
            role: 'employer',
            linkedBusinessId: 'PAR-01',
            pathwayCode: null,
            country: 'Kenya',
            city: 'Nairobi',
            learningGoal: null,
          },
          {
            uid: 'seed-partner-01',
            firstName: 'Kwaku',
            secondName: 'Mensah',
            email: 'partner@konexio-demo.org',
            password: demoPassword,
            hasOrganisation: true,
            organisation: 'BrightPath Foundation',
            role: 'partner',
            linkedBusinessId: 'PAR-02',
            pathwayCode: null,
            country: 'Ghana',
            city: 'Accra',
            learningGoal: null,
          },
          {
            uid: 'seed-admin-01',
            firstName: 'Naledi',
            secondName: 'Dube',
            email: adminEmail,
            password: adminPassword,
            hasOrganisation: true,
            organisation: 'Konexio Africa',
            role: 'admin',
            linkedBusinessId: 'TEAM-01',
            pathwayCode: null,
            country: 'Kenya',
            city: 'Nairobi',
            learningGoal: null,
          },
        ];

        for (const su of seedUsers) {
          const [inserted] = await tx
            .insert(users)
            .values({
              uid: su.uid,
              email: su.email,
              passwordHash: bcrypt.hashSync(su.password, 10),
              firstName: su.firstName,
              secondName: su.secondName,
              role: su.role,
              organisation: su.organisation ?? '',
              hasOrganisation: su.hasOrganisation,
              pathwayCode: su.pathwayCode,
              country: su.country,
              city: su.city,
              learningGoal: su.learningGoal,
              linkedBusinessId: su.linkedBusinessId,
              isActive: true,
            })
            .onConflictDoNothing({ target: users.email })
            .returning({ id: users.id, email: users.email });

          if (inserted) {
            userIdByEmail.set(inserted.email, inserted.id);
          } else {
            const [existing] = await tx
              .select({ id: users.id, email: users.email })
              .from(users)
              .where(eq(users.email, su.email));
            if (existing) userIdByEmail.set(existing.email, existing.id);
          }
        }

        const learnerId = userIdByEmail.get('learner@konexio-demo.org');
        if (learnerId) {
          await tx
            .insert(learnerProfiles)
            .values({
              userId: learnerId,
              country: 'Kenya',
              city: 'Nairobi',
              pathwayCode: 'P1',
              learningGoal:
                'Complete Part I foundations and launch a portfolio in Digital Marketing.',
              cohortStatus: 'Active cohort · Part I in progress',
            })
            .onConflictDoNothing({ target: learnerProfiles.userId });

          await tx
            .insert(learnerProgress)
            .values([
              { userId: learnerId, moduleCode: 'M0', completed: true, completedAt: new Date() },
              { userId: learnerId, moduleCode: 'M1', completed: true, completedAt: new Date() },
            ])
            .onConflictDoNothing();
        }
      }

      if (!hasAlumni) {
        const pathwayNameByCode = new Map(PATHWAYS.map((p) => [p.code, p.name]));
        const alumniOwnerUserId = userIdByEmail.get('alumni@konexio-demo.org') ?? null;

        for (const alum of INITIAL_ALUMNI) {
          const fullName = `${alum.first_name} ${alum.last_name}`;
          const linkedUser = alum.business_id === 'ALU-01' ? alumniOwnerUserId : null;
          const [insertedAlum] = await tx
            .insert(alumniProfiles)
            .values({
              businessId: alum.business_id,
              userId: linkedUser,
              firstName: alum.first_name,
              lastName: alum.last_name,
              name: fullName,
              country: alum.country,
              city: alum.city,
              pathwayCode: alum.pathway_code,
              pathwayName: pathwayNameByCode.get(alum.pathway_code) ?? alum.pathway_code,
              skills: alum.skills,
              languages: alum.languages,
              availability: alum.availability,
              shortBio: alum.short_bio,
              portfolioTitle: alum.portfolio_title,
              portfolioUrl: alum.portfolio_url ?? '',
              portfolioImage: alum.portfolio_image ?? '',
              personalWebsite: alum.personal_website ?? '',
              linkedinUrl: alum.linkedin_url ?? '',
              photoFile: alum.portfolio_image ?? '',
              videoFile: alum.has_video ? 'alumni_intro.mp4' : '',
              hasVideo: alum.has_video,
              consentToPublish: alum.consent_to_publish,
              consentToShowPhoto: alum.consent_to_show_photo,
              consentToBeContacted: alum.consent_to_publish,
              consentDate: alum.consent_to_publish ? new Date('2026-09-15T10:00:00Z') : null,
              privateNotificationEmail: alum.private_notification_email,
              featured: ['ALU-01', 'ALU-02', 'ALU-03', 'ALU-04'].includes(alum.business_id),
              isActive: alum.is_active,
              isSample: true,
            })
            .onConflictDoNothing({ target: alumniProfiles.businessId })
            .returning({ id: alumniProfiles.id });

          if (insertedAlum && alum.skills.length > 0) {
            for (const skill of alum.skills) {
              await tx
                .insert(alumniSkills)
                .values({ alumniId: insertedAlum.id, skill })
                .onConflictDoNothing();
            }
          }

          await tx.insert(consentRecords).values({
            userId: linkedUser,
            subjectEmail: alum.private_notification_email,
            subjectType: 'alumni',
            consentScope: 'public_directory_profile',
            granted: alum.consent_to_publish,
            source: 'initial_seed',
            notes: `${alum.business_id} (${fullName}) initial consent status`,
          });
        }

        const employerOwnerId = userIdByEmail.get('employer@konexio-demo.org') ?? null;
        const partnerOwnerId = userIdByEmail.get('partner@konexio-demo.org') ?? null;

        for (const partner of INITIAL_PARTNERS) {
          const ownerId =
            partner.business_id === 'PAR-01'
              ? employerOwnerId
              : partner.business_id === 'PAR-02'
                ? partnerOwnerId
                : null;
          await tx
            .insert(partners)
            .values({
              businessId: partner.business_id,
              userId: ownerId,
              organisation: partner.organisation,
              type: partner.type,
              country: partner.country,
              description: partner.description,
              website: partner.website ?? '',
              phone: '',
              logoKey: partner.logo_key ?? '',
              privateContactName: 'Partner Coordinator',
              privateContactEmail: `${partner.business_id.toLowerCase()}@konexio-africa.invalid`,
              privateContactPhone: '',
              status: partner.status,
              showOnSite: partner.show_on_site,
              approved: partner.status === 'approved',
            })
            .onConflictDoNothing({ target: partners.businessId });
        }

        await tx
          .insert(interestSubmissions)
          .values([
            {
              referenceId: 'SUB-001',
              submissionType: 'alumni',
              visitorType: 'Employer',
              routingMode: 'direct_alumni',
              targetAlumniBusinessId: 'ALU-01',
              targetAlumniName: 'Amina Wanjiru',
              recipientEmailMasked: 'a***@konexio-africa.invalid',
              senderName: 'Maria Lopez',
              senderEmail: 'maria@savanna-digital.invalid',
              senderOrganisation: 'Savanna Digital Works',
              country: 'Kenya',
              pathwayCode: 'P1',
              message: 'We would like to discuss a three-month social media contract.',
              newsletterOptIn: false,
              privacyConsent: true,
              status: 'routed',
              createdAt: new Date('2026-10-28T09:14:00Z'),
            },
            {
              referenceId: 'SUB-003',
              submissionType: 'pathway',
              visitorType: 'Client',
              routingMode: 'pathway_match',
              targetAlumniBusinessId: 'ALU-03',
              targetAlumniName: 'Chiamaka Eze',
              recipientEmailMasked: 'c***@konexio-africa.invalid',
              senderName: 'Fatima Hassan',
              senderEmail: 'fatima@coastline-commerce.invalid',
              senderOrganisation: 'Coastline Commerce',
              country: 'Kenya',
              pathwayCode: 'P2',
              message: 'We need a designer for packaging graphics. Who is available?',
              newsletterOptIn: false,
              privacyConsent: true,
              status: 'routed',
              createdAt: new Date('2026-10-29T08:41:00Z'),
            },
            {
              referenceId: 'SUB-004',
              submissionType: 'pathway',
              visitorType: 'Employer',
              routingMode: 'pathway_match',
              targetAlumniBusinessId: 'ALU-05,ALU-16',
              targetAlumniName: 'Aline Uwase & Zainab Bello',
              recipientEmailMasked: 'partnerships@konexio-africa.invalid',
              senderName: 'Ahmed Said',
              senderEmail: 'ahmed@lakeside-bpo.invalid',
              senderOrganisation: 'Lakeside BPO',
              country: 'Uganda',
              pathwayCode: 'P3',
              message: 'Looking for four customer support agents starting in January.',
              newsletterOptIn: false,
              privacyConsent: true,
              status: 'routed',
              createdAt: new Date('2026-10-29T10:55:00Z'),
            },
            {
              referenceId: 'SUB-009',
              submissionType: 'alumni',
              visitorType: 'Client',
              routingMode: 'team_triage',
              targetAlumniBusinessId: 'ALU-08',
              targetAlumniName: 'Brian Kiprop',
              recipientEmailMasked: 'partnerships@konexio-africa.invalid',
              senderName: 'Tom Becker',
              senderEmail: 'tom@independent.invalid',
              senderOrganisation: 'Independent',
              country: 'Kenya',
              pathwayCode: 'P4',
              message: 'Looking for someone to build a lead list for my startup.',
              newsletterOptIn: false,
              privacyConsent: false,
              status: 'flagged_no_consent',
              createdAt: new Date('2026-10-31T09:05:00Z'),
            },
          ])
          .onConflictDoNothing({ target: interestSubmissions.referenceId });

        await tx
          .insert(newsletterSubscriptions)
          .values([
            {
              email: 'alumni.reader@konexio-africa.invalid',
              list: 'alumni',
              source: 'initial_seed',
              status: 'subscribed',
              subscribedAt: new Date('2026-10-01T10:00:00Z'),
            },
            {
              email: 'partner.reader@konexio-africa.invalid',
              list: 'donor_partner',
              source: 'initial_seed',
              status: 'subscribed',
              subscribedAt: new Date('2026-10-05T12:30:00Z'),
            },
          ])
          .onConflictDoNothing();

        const adminId = userIdByEmail.get(adminEmail) ?? null;
        const learnerId = userIdByEmail.get('learner@konexio-demo.org') ?? null;

        await tx.insert(notifications).values([
          {
            userId: learnerId,
            targetRole: 'learner',
            category: 'curriculum',
            title: 'Part I modules synced',
            body: 'Your Digi Pass Part I progress (M0–M5) is saved directly to your learner record.',
            linkPath: '/dashboard',
          },
          {
            userId: alumniOwnerUserId,
            targetRole: 'alumni',
            category: 'inquiry',
            title: 'New employer enquiry (SUB-001)',
            body: 'Savanna Digital Works expressed interest in a three-month social media contract.',
            linkPath: '/dashboard',
          },
          {
            userId: adminId,
            targetRole: 'admin',
            category: 'governance',
            title: 'Moderation queue ready',
            body: 'Consent logs, submissions, and partner review records are backed by Cloud SQL.',
            linkPath: '/admin',
          },
        ]);
      }
    });
  } catch (error) {
    console.error('Database seed failed:', error);
    throw new Error('Failed to initialize database state', { cause: error });
  }
}
