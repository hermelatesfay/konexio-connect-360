import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    firebaseUid: text('firebase_uid').unique(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    firstName: text('first_name').notNull(),
    secondName: text('second_name').notNull(),
    role: text('role').notNull().default('learner'),
    organisation: text('organisation').notNull().default(''),
    hasOrganisation: boolean('has_organisation').notNull().default(false),
    pathwayCode: text('pathway_code'),
    country: text('country'),
    city: text('city'),
    learningGoal: text('learning_goal'),
    linkedBusinessId: text('linked_business_id'),
    isActive: boolean('is_active').notNull().default(true),
    mfaEnabled: boolean('mfa_enabled').notNull().default(false),
    mfaSecretEncrypted: text('mfa_secret_encrypted'),
    mfaPendingSecretEncrypted: text('mfa_pending_secret_encrypted'),
    mfaLastUsedStep: integer('mfa_last_used_step'),
    mfaRecoveryCodesHash: jsonb('mfa_recovery_codes_hash').$type<string[]>().notNull().default([]),
    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    archivedAt: timestamp('archived_at'),
  },
  (table) => [index('users_role_idx').on(table.role)],
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('password_reset_user_idx').on(table.userId)],
);

export const pathways = pgTable('pathways', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull().default('Digital Pathway'),
  summary: text('summary').notNull(),
  status: text('status').notNull().default('Available'),
  targetRoles: jsonb('target_roles').$type<string[]>().notNull().default([]),
  skills: jsonb('skills').$type<string[]>().notNull().default([]),
  durationWeeks: integer('duration_weeks').notNull().default(12),
  learnersCount: integer('learners_count').notNull().default(0),
  completedCount: integer('completed_count').notNull().default(0),
  freelancingActive: integer('freelancing_active').notNull().default(0),
  avgDaysToFirstGig: integer('avg_days_to_first_gig').notNull().default(45),
  employmentRatePct: integer('employment_rate_pct').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const courseModules = pgTable('course_modules', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  part: text('part').notNull().default('Part I'),
  duration: text('duration').notNull().default('4 hours'),
  submodules: jsonb('submodules').$type<string[]>().notNull().default([]),
  summary: text('summary').notNull().default(''),
  hours: integer('hours').notNull().default(4),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  businessId: text('business_id').notNull().unique(),
  country: text('country').notNull(),
  city: text('city').notNull(),
  latitude: doublePrecision('latitude').notNull().default(0),
  longitude: doublePrecision('longitude').notNull().default(0),
  learnersTrained: integer('learners_trained').notNull().default(0),
  graduates: integer('graduates').notNull().default(0),
  employedOrFreelancing: integer('employed_or_freelancing').notNull().default(0),
  employmentRatePct: integer('employment_rate_pct').notNull().default(0),
  womenPct: integer('women_pct').notNull().default(0),
  cohortsCompleted: integer('cohorts_completed').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const yearlyImpacts = pgTable('yearly_impacts', {
  id: serial('id').primaryKey(),
  year: integer('year').notNull().unique(),
  isYtd: boolean('is_ytd').notNull().default(false),
  learnersTrained: integer('learners_trained').notNull().default(0),
  graduates: integer('graduates').notNull().default(0),
  employmentRatePct: integer('employment_rate_pct').notNull().default(0),
  womenPct: integer('women_pct').notNull().default(0),
  countriesActive: integer('countries_active').notNull().default(0),
  cohortsCompleted: integer('cohorts_completed').notNull().default(0),
  employerPartnersCumulative: integer('employer_partners_cumulative').notNull().default(0),
  note: text('note'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const annualReports = pgTable('annual_reports', {
  id: serial('id').primaryKey(),
  year: integer('year').notNull().unique(),
  title: text('title').notNull(),
  filename: text('filename').notNull(),
  visionStatement: text('vision_statement').notNull().default(''),
  directorMessage: text('director_message').notNull().default(''),
  summary: text('summary').notNull().default(''),
  highlights: jsonb('highlights').$type<string[]>().notNull().default([]),
  publicUrl: text('public_url').notNull(),
  learnersTrained: integer('learners_trained').notNull().default(0),
  graduates: integer('graduates').notNull().default(0),
  graduationRatePct: integer('graduation_rate_pct').notNull().default(0),
  employedOrFreelancingPct: integer('employed_or_freelancing_pct').notNull().default(0),
  womenPct: integer('women_pct').notNull().default(0),
  countries: integer('countries').notNull().default(0),
  cohorts: integer('cohorts').notNull().default(0),
  employerPartners: integer('employer_partners').notNull().default(0),
  isSample: boolean('is_sample').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const impactStories = pgTable('impact_stories', {
  id: serial('id').primaryKey(),
  businessId: text('business_id').notNull().unique(),
  title: text('title').notNull(),
  location: text('location').notNull(),
  pathway: text('pathway').notNull().default(''),
  quote: text('quote').notNull(),
  attribution: text('attribution').notNull().default(''),
  highlight: text('highlight'),
  summary: text('summary').notNull().default(''),
  outcomeMetric: text('outcome_metric').notNull().default(''),
  isSample: boolean('is_sample').notNull().default(true),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  businessId: text('business_id').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  name: text('name').notNull(),
  roleTitle: text('role_title').notNull(),
  category: text('category').notNull().default('Team'),
  country: text('country').notNull().default('Regional'),
  bio: text('bio').notNull().default(''),
  photoUrl: text('photo_url').notNull().default(''),
  linkedinUrl: text('linkedin_url').notNull().default(''),
  roleMailbox: text('role_mailbox').notNull().default(''),
  contactTopic: text('contact_topic').notNull().default('Press and general'),
  displayEmailPublicly: boolean('display_email_publicly').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const partners = pgTable(
  'partners',
  {
    id: serial('id').primaryKey(),
    businessId: text('business_id').notNull().unique(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    organisation: text('organisation').notNull(),
    type: text('type').notNull(),
    country: text('country').notNull(),
    description: text('description').notNull(),
    website: text('website').notNull().default(''),
    phone: text('phone').notNull().default(''),
    logoKey: text('logo_key').notNull().default(''),
    logoFileId: integer('logo_file_id'),
    privateContactName: text('private_contact_name').notNull().default(''),
    privateContactEmail: text('private_contact_email').notNull().default(''),
    privateContactPhone: text('private_contact_phone').notNull().default(''),
    status: text('status').notNull().default('pending_review'),
    showOnSite: boolean('show_on_site').notNull().default(false),
    approved: boolean('approved').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    archivedAt: timestamp('archived_at'),
  },
  (table) => [
    index('partners_public_idx').on(table.showOnSite, table.approved),
    index('partners_user_idx').on(table.userId),
  ],
);

export const alumniProfiles = pgTable(
  'alumni_profiles',
  {
    id: serial('id').primaryKey(),
    businessId: text('business_id').notNull().unique(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'set null' })
      .unique(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    name: text('name').notNull(),
    country: text('country').notNull(),
    city: text('city').notNull().default(''),
    pathwayCode: text('pathway_code').notNull(),
    pathwayName: text('pathway_name').notNull(),
    skills: jsonb('skills').$type<string[]>().notNull().default([]),
    languages: jsonb('languages').$type<string[]>().notNull().default([]),
    availability: text('availability').notNull().default('Available for freelance work'),
    shortBio: text('short_bio').notNull().default(''),
    portfolioTitle: text('portfolio_title').notNull().default(''),
    portfolioUrl: text('portfolio_url').notNull().default(''),
    portfolioImage: text('portfolio_image').notNull().default(''),
    personalWebsite: text('personal_website').notNull().default(''),
    linkedinUrl: text('linkedin_url').notNull().default(''),
    photoFile: text('photo_file').notNull().default(''),
    photoFileId: integer('photo_file_id'),
    portfolioImageId: integer('portfolio_image_id'),
    videoFile: text('video_file').notNull().default(''),
    hasVideo: boolean('has_video').notNull().default(false),
    consentToPublish: boolean('consent_to_publish').notNull().default(false),
    consentToShowPhoto: boolean('consent_to_show_photo').notNull().default(false),
    consentToBeContacted: boolean('consent_to_be_contacted').notNull().default(true),
    consentDate: timestamp('consent_date'),
    privateNotificationEmail: text('private_notification_email').notNull().default(''),
    featured: boolean('featured').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    isSample: boolean('is_sample').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    archivedAt: timestamp('archived_at'),
  },
  (table) => [
    index('alumni_publish_idx').on(table.consentToPublish, table.featured),
    index('alumni_pathway_idx').on(table.pathwayCode),
    index('alumni_country_idx').on(table.country),
  ],
);

export const alumniSkills = pgTable(
  'alumni_skills',
  {
    id: serial('id').primaryKey(),
    alumniId: integer('alumni_id')
      .references(() => alumniProfiles.id, { onDelete: 'restrict' })
      .notNull(),
    skill: text('skill').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('alumni_skills_unique_idx').on(table.alumniId, table.skill),
    index('alumni_skills_skill_idx').on(table.skill),
  ],
);

export const learnerProfiles = pgTable('learner_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'restrict' })
    .notNull()
    .unique(),
  country: text('country').notNull(),
  city: text('city').notNull().default(''),
  pathwayCode: text('pathway_code').notNull(),
  learningGoal: text('learning_goal').notNull().default(''),
  cohortStatus: text('cohort_status').notNull().default('Application under review'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const learnerProgress = pgTable(
  'learner_progress',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    moduleCode: text('module_code').notNull(),
    completed: boolean('completed').notNull().default(false),
    completedAt: timestamp('completed_at'),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('learner_progress_user_module_idx').on(table.userId, table.moduleCode)],
);

export const interestSubmissions = pgTable(
  'interest_submissions',
  {
    id: serial('id').primaryKey(),
    referenceId: text('reference_id').notNull().unique(),
    submissionType: text('submission_type').notNull(),
    visitorType: text('visitor_type').notNull().default('Employer'),
    routingMode: text('routing_mode').notNull().default('team_triage'),
    targetAlumniBusinessId: text('target_alumni_business_id'),
    targetAlumniName: text('target_alumni_name'),
    recipientEmailMasked: text('recipient_email_masked').notNull().default(''),
    senderName: text('sender_name').notNull(),
    senderEmail: text('sender_email').notNull(),
    senderOrganisation: text('sender_organisation').notNull().default(''),
    country: text('country').notNull().default(''),
    pathwayCode: text('pathway_code').notNull().default(''),
    message: text('message').notNull(),
    newsletterOptIn: boolean('newsletter_opt_in').notNull().default(false),
    privacyConsent: boolean('privacy_consent').notNull().default(true),
    status: text('status').notNull().default('received'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('interest_status_idx').on(table.status, table.createdAt)],
);

export const contactMessages = pgTable(
  'contact_messages',
  {
    id: serial('id').primaryKey(),
    referenceId: text('reference_id').notNull().unique(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull().default(''),
    visitorCategory: text('visitor_category').notNull().default('General'),
    organisation: text('organisation').notNull().default(''),
    topic: text('topic').notNull().default('General enquiry'),
    routedToRole: text('routed_to_role').notNull().default('Country Director'),
    routedMailbox: text('routed_mailbox').notNull().default(''),
    message: text('message').notNull(),
    privacyConsent: boolean('privacy_consent').notNull().default(true),
    status: text('status').notNull().default('received'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('contact_status_idx').on(table.status, table.createdAt)],
);

export const newsletterSubscriptions = pgTable(
  'newsletter_subscriptions',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull(),
    list: text('list').notNull(),
    source: text('source').notNull().default('footer'),
    status: text('status').notNull().default('subscribed'),
    subscribedAt: timestamp('subscribed_at').notNull().defaultNow(),
    unsubscribedAt: timestamp('unsubscribed_at'),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('newsletter_email_list_idx').on(table.email, table.list)],
);

export const consentRecords = pgTable(
  'consent_records',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    subjectEmail: text('subject_email').notNull(),
    subjectType: text('subject_type').notNull(),
    consentScope: text('consent_scope').notNull(),
    granted: boolean('granted').notNull(),
    source: text('source').notNull(),
    notes: text('notes').notNull().default(''),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('consent_subject_idx').on(table.subjectEmail, table.createdAt)],
);

export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    targetRole: text('target_role'),
    category: text('category').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    linkPath: text('link_path').notNull().default('/dashboard'),
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('notifications_user_idx').on(table.userId, table.isRead),
    index('notifications_role_idx').on(table.targetRole, table.isRead),
  ],
);

export const impactEvents = pgTable('impact_events', {
  id: serial('id').primaryKey(),
  eventType: text('event_type').notNull(),
  title: text('title').notNull(),
  location: text('location').notNull(),
  pathway: text('pathway').notNull(),
  deltaLearners: integer('delta_learners').notNull().default(0),
  deltaGraduates: integer('delta_graduates').notNull().default(0),
  employmentRatePct: integer('employment_rate_pct'),
  recordedByUserId: integer('recorded_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  recordedAt: timestamp('recorded_at').notNull().defaultNow(),
});

export const uploadedFiles = pgTable(
  'uploaded_files',
  {
    id: serial('id').primaryKey(),
    publicId: text('public_id').notNull().unique(),
    ownerUserId: integer('owner_user_id').references(() => users.id, { onDelete: 'set null' }),
    purpose: text('purpose').notNull().default('general'),
    originalName: text('original_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    dataBase64: text('data_base64').notNull(),
    isPublic: boolean('is_public').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('uploaded_files_owner_idx').on(table.ownerUserId, table.purpose)],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    actorUserId: integer('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    actorEmail: text('actor_email').notNull().default('system'),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
    ipAddress: text('ip_address').notNull().default(''),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('audit_logs_created_idx').on(table.createdAt)],
);

export const platformSettings = pgTable('platform_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  alumniProfile: one(alumniProfiles, {
    fields: [users.id],
    references: [alumniProfiles.userId],
  }),
  learnerProfile: one(learnerProfiles, {
    fields: [users.id],
    references: [learnerProfiles.userId],
  }),
  partners: many(partners),
  learnerProgress: many(learnerProgress),
  notifications: many(notifications),
  uploadedFiles: many(uploadedFiles),
}));

export const alumniProfilesRelations = relations(alumniProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [alumniProfiles.userId],
    references: [users.id],
  }),
  skillRows: many(alumniSkills),
}));

export const alumniSkillsRelations = relations(alumniSkills, ({ one }) => ({
  alumni: one(alumniProfiles, {
    fields: [alumniSkills.alumniId],
    references: [alumniProfiles.id],
  }),
}));
