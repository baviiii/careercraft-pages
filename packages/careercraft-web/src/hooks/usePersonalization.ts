import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { applyAccent, resolveAccent } from '@/lib/personaTheme';
import type { AIPersona } from '@/hooks/useUserProfile';

// Types for personalization
export interface PersonalizedProfile {
  // Basic info
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  headline: string | null;
  bio: string | null;
  
  // Career info
  currentJobTitle: string | null;
  currentCompany: string | null;
  industry: string | null;
  careerLevel: string | null;
  yearsOfExperience: string | null;
  employmentStatus: string;
  
  // Career goals
  targetJobTitles: string[];

  /** Job-board phrasings of the role, from onboard-analyze. */

  searchTerms: string[];
  targetCompanies: string[];
  desiredSalaryMin: number | null;
  desiredSalaryMax: number | null;
  desiredSalaryCurrency: string;
  workArrangement: string[];
  preferredLocations: string[];
  jobChangeTimeline: string | null;
  
  // AI persona from onboarding (archetype, function, narrative, ...)
  aiPersona: AIPersona | null;

  // Skills & Certifications
  skills: PersonalizedSkill[];
  certifications: PersonalizedCertification[];
  
  // Preferences
  jobPreferences: JobPreferences;
  interviewPreferences: InterviewPreferences;
  newsPreferences: NewsPreferences;
  
  // Meta
  profileCompleteness: number;
  isLoaded: boolean;
}

export interface PersonalizedSkill {
  id: string;
  name: string;
  proficiency: string;
  category: string;
  yearsExperience: number | null;
  isPrimary: boolean;
}

export interface PersonalizedCertification {
  id: string;
  name: string;
  issuer: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
}

export interface JobPreferences {
  industries: string[];
  excludedCompanies: string[];
  minSalary: number | null;
  jobTypes: string[];
  companySizes: string[];
  benefitsPriorities: string[];
  remotePreference: string;
}

export interface InterviewPreferences {
  defaultField: string;
  defaultDifficulty: string;
  focusAreas: string[];
  sessionDuration: number;
  feedbackVerbosity: string;
  questionTypes: string[];
}

export interface NewsPreferences {
  followedIndustries: string[];
  followedCompanies: string[];
  contentTypes: string[];
  digestFrequency: string;
}

/* ── Likeliness / match rating ───────────────────────────────────────────────
   Raw match scores are an open-ended sum of weighted signals. We map them onto
   a 0–100 "likeliness" with a saturating curve (diminishing returns) and a band
   so every surface (jobs, market, news) can show a consistent rating. */
export type MatchBand = 'strong' | 'good' | 'fair' | 'low';

/* ── Industry matching ───────────────────────────────────────────────────────
   Two taxonomies that do not agree, and no shared vocabulary between them.

   Our side is `INDUSTRIES` in useUserProfile: 20 title-case values, some
   compound ("Finance & Banking"). A job arrives with whatever `categorizeJob`
   produced — one of five collapsed lowercase words, or a raw Adzuna label like
   "Trade & Construction Jobs".

   A whole-string `includes` was wrong in both directions. "Finance & Banking"
   can never be found inside "finance", because the needle is longer than the
   haystack — so anyone in finance silently lost this signal. Comparing
   significant words instead fixes that, and the explicit synonyms cover the
   cases where the two taxonomies simply use different nouns for the same
   sector. Everything here is auditable: if a user says the industry match is
   wrong, the reason is one of these lines.

   This is exactly the work an embedding would do without a table — "Education"
   and "Teaching Jobs" are near-identical in vector space and share no word.
   Worth revisiting if this list grows past about twenty entries; below that,
   a map you can read beats a model you cannot. */
const INDUSTRY_STOP_WORDS = new Set(['and', 'the', 'of', 'jobs', 'other']);

function industryTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !INDUSTRY_STOP_WORDS.has(w));
}

/** Words a job board is likely to use for one of our industries. */
const INDUSTRY_SYNONYMS: Record<string, string[]> = {
  'education': ['teaching', 'training', 'academic'],
  'real estate': ['property'],
  'non-profit': ['charity', 'voluntary', 'community'],
  'transportation': ['logistics', 'warehouse', 'transport', 'driving'],
  'technology': ['software', 'engineering'],
  'healthcare': ['nursing', 'medical', 'care'],
  'media & entertainment': ['creative', 'advertising'],
  'government': ['public sector', 'defence'],
};

export function industryMatches(
  industry: string,
  category?: string,
  title?: string,
): boolean {
  const wanted = [
    ...industryTokens(industry),
    ...(INDUSTRY_SYNONYMS[industry.toLowerCase()] ?? []).flatMap(industryTokens),
  ];
  if (wanted.length === 0) return false;

  /* Category is the board's own classification and far more reliable than the
     title, which rarely names a sector — "Healthcare" does not appear in
     "Registered Nurse - Ward 3B". Title stays as a fallback for the sources
     that send no category at all. */
  const haystack = industryTokens(`${category ?? ''} ${title ?? ''}`);
  return wanted.some((w) => haystack.includes(w));
}

/* The window raw cosine is mapped through, and the most it can contribute.
   Deliberately not a pass/fail threshold — see the note at the usage site.
   Calibrate against the [similarity] spreads logged by job-news. */
const SIMILARITY_FLOOR = 0.25;
const SIMILARITY_CEILING = 0.75;
const SIMILARITY_MAX_POINTS = 25;
/** Lower than jobs: an article about your field is worth less than a role in it. */
const SIMILARITY_MAX_POINTS_ARTICLE = 18;

/**
 * Raw cosine -> points, continuously. No threshold: see the note at the job
 * scorer's usage site. Shared by both scorers so a score means the same thing
 * on the jobs page as it does on news — two copies of this would drift and the
 * numbers would still look comparable.
 */
function similarityPoints(similarity: number | undefined, maxPoints: number): number {
  if (typeof similarity !== 'number' || !Number.isFinite(similarity)) return 0;
  const fraction = Math.max(
    0,
    Math.min(1, (similarity - SIMILARITY_FLOOR) / (SIMILARITY_CEILING - SIMILARITY_FLOOR)),
  );
  return fraction * maxPoints;
}

export function matchLevel(score: number): { match: number; band: MatchBand } {
  const match = score <= 0 ? 0 : Math.round(100 * (1 - Math.exp(-score / 35)));
  const band: MatchBand =
    match >= 75 ? 'strong' : match >= 55 ? 'good' : match >= 35 ? 'fair' : 'low';
  return { match, band };
}

// Default values
const DEFAULT_JOB_PREFERENCES: JobPreferences = {
  industries: [],
  excludedCompanies: [],
  minSalary: null,
  jobTypes: ['full-time'],
  companySizes: [],
  benefitsPriorities: [],
  remotePreference: 'any',
};

const DEFAULT_INTERVIEW_PREFERENCES: InterviewPreferences = {
  defaultField: 'general',
  defaultDifficulty: 'medium',
  focusAreas: [],
  sessionDuration: 30,
  feedbackVerbosity: 'detailed',
  questionTypes: ['behavioral', 'technical'],
};

const DEFAULT_NEWS_PREFERENCES: NewsPreferences = {
  followedIndustries: [],
  followedCompanies: [],
  contentTypes: ['trends', 'insights', 'salary'],
  digestFrequency: 'weekly',
};

const DEFAULT_PROFILE: PersonalizedProfile = {
  fullName: null,
  email: null,
  phone: null,
  location: null,
  headline: null,
  bio: null,
  currentJobTitle: null,
  currentCompany: null,
  industry: null,
  careerLevel: null,
  yearsOfExperience: null,
  employmentStatus: 'employed',
  targetJobTitles: [],

  searchTerms: [],
  targetCompanies: [],
  desiredSalaryMin: null,
  desiredSalaryMax: null,
  desiredSalaryCurrency: 'AUD',
  workArrangement: [],
  preferredLocations: [],
  jobChangeTimeline: null,
  aiPersona: null,
  skills: [],
  certifications: [],
  jobPreferences: DEFAULT_JOB_PREFERENCES,
  interviewPreferences: DEFAULT_INTERVIEW_PREFERENCES,
  newsPreferences: DEFAULT_NEWS_PREFERENCES,
  profileCompleteness: 0,
  isLoaded: false,
};

export function usePersonalization() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<PersonalizedProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch user profile and preferences
  const fetchProfile = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      setUserId(session.user.id);
      const userEmail = session.user.email;

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      // Fetch preferences
      const { data: prefsData } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      // Fetch skills
      const { data: skillsData } = await supabase
        .from('user_skills')
        .select('*')
        .eq('user_id', session.user.id)
        .order('is_primary', { ascending: false });

      // Fetch certifications
      const { data: certsData } = await supabase
        .from('user_certifications')
        .select('*')
        .eq('user_id', session.user.id);

      // Resolve skill names — user_skills stores only skill_id (FK -> skill_tags.id),
      // so without this every skill reads as a UUID and never matches a job's skills.
      const skillIds = Array.from(
        new Set((skillsData || []).map((s) => s.skill_id).filter((x): x is string => !!x)),
      );
      const skillNameById = new Map<string, string>();
      if (skillIds.length) {
        const { data: tagRows } = await supabase
          .from('skill_tags')
          .select('id,name')
          .in('id', skillIds);
        (tagRows || []).forEach((t) => skillNameById.set(t.id, t.name));
      }

      // Parse preferences JSON fields safely
      const jobPrefs = prefsData?.job_preferences as any || DEFAULT_JOB_PREFERENCES;
      const interviewPrefs = prefsData?.interview_preferences as any || DEFAULT_INTERVIEW_PREFERENCES;
      const newsPrefs = prefsData?.news_preferences as any || DEFAULT_NEWS_PREFERENCES;

      // Calculate profile completeness
      let completeness = 0;
      if (profileData?.full_name) completeness += 10;
      if (profileData?.headline) completeness += 5;
      if (profileData?.bio) completeness += 5;
      if (profileData?.current_job_title) completeness += 10;
      if (profileData?.current_company) completeness += 5;
      if (profileData?.industry) completeness += 10;
      if (profileData?.career_level) completeness += 10;
      if (profileData?.years_of_experience) completeness += 5;
      if ((skillsData?.length || 0) >= 3) completeness += 20;
      else if ((skillsData?.length || 0) >= 1) completeness += 10;
      if (profileData?.target_job_titles?.length) completeness += 10;
      if (profileData?.location_city) completeness += 5;
      if (profileData?.phone) completeness += 5;

      // Build the personalized profile
      const personalizedProfile: PersonalizedProfile = {
        fullName: profileData?.full_name || session.user.user_metadata?.full_name || null,
        email: userEmail || null,
        phone: profileData?.phone || null,
        location: profileData?.location_city 
          ? `${profileData.location_city}${profileData.location_country ? `, ${profileData.location_country}` : ''}`
          : null,
        headline: profileData?.headline || null,
        bio: profileData?.bio || null,
        currentJobTitle: profileData?.current_job_title || null,
        currentCompany: profileData?.current_company || null,
        industry: profileData?.industry || null,
        careerLevel: profileData?.career_level || null,
        yearsOfExperience: profileData?.years_of_experience || null,
        employmentStatus: profileData?.employment_status || 'employed',
        targetJobTitles: profileData?.target_job_titles || [],
          searchTerms: profileData?.search_terms || [],
        targetCompanies: profileData?.target_companies || [],
        desiredSalaryMin: profileData?.desired_salary_min || null,
        desiredSalaryMax: profileData?.desired_salary_max || null,
        desiredSalaryCurrency: profileData?.desired_salary_currency || 'AUD',
        workArrangement: profileData?.work_arrangement || [],
        preferredLocations: profileData?.preferred_locations || [],
        jobChangeTimeline: profileData?.job_change_timeline || null,
        aiPersona: (profileData?.ai_persona as AIPersona | null) ?? null,
        skills: (skillsData || []).map(s => ({
          id: s.id,
          name: (s.skill_id ? skillNameById.get(s.skill_id) : undefined) || s.skill_id || 'Unknown Skill',
          proficiency: s.proficiency || 'intermediate',
          category: s.category || 'technical',
          yearsExperience: s.years_experience,
          isPrimary: s.is_primary || false,
        })),
        certifications: (certsData || []).map(c => ({
          id: c.id,
          name: c.name,
          issuer: c.issuer,
          issueDate: c.issue_date,
          expiryDate: c.expiry_date,
          credentialId: c.credential_id,
          credentialUrl: c.credential_url,
        })),
        jobPreferences: {
          industries: jobPrefs.industries || [],
          excludedCompanies: jobPrefs.excluded_companies || [],
          minSalary: jobPrefs.min_salary || null,
          jobTypes: jobPrefs.job_types || ['full-time'],
          companySizes: jobPrefs.company_sizes || [],
          benefitsPriorities: jobPrefs.benefits_priorities || [],
          remotePreference: jobPrefs.remote_preference || 'any',
        },
        interviewPreferences: {
          defaultField: interviewPrefs.default_field || 'general',
          defaultDifficulty: interviewPrefs.default_difficulty || 'medium',
          focusAreas: interviewPrefs.focus_areas || [],
          sessionDuration: interviewPrefs.session_duration || 30,
          feedbackVerbosity: interviewPrefs.feedback_verbosity || 'detailed',
          questionTypes: interviewPrefs.question_types || ['behavioral', 'technical'],
        },
        newsPreferences: {
          followedIndustries: newsPrefs.followed_industries || [],
          followedCompanies: newsPrefs.followed_companies || [],
          contentTypes: newsPrefs.content_types || ['trends', 'insights', 'salary'],
          digestFrequency: newsPrefs.digest_frequency || 'weekly',
        },
        profileCompleteness: Math.min(completeness, 100),
        isLoaded: true,
      };

      setProfile(personalizedProfile);

      // The whole app's accent follows the persona — recompute on every load
      // so profile edits and re-runs of onboarding re-tint immediately.
      const persona = personalizedProfile.aiPersona;
      applyAccent(
        resolveAccent({
          personaFunction: persona?.function,
          subFunction: persona?.subFunction,
          vertical: persona?.vertical,
          industry: personalizedProfile.industry,
        }),
      );
    } catch (error) {
      console.error('Error fetching personalization data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Get personalized job search query based on profile.
  // Job boards match a single phrase best — "A OR B" style strings return noise,
  // so lead with the top target title and fall back gracefully.
  const getPersonalizedJobQuery = useCallback(() => {
    if (profile.targetJobTitles.length > 0) return profile.targetJobTitles[0];
    if (profile.currentJobTitle) return profile.currentJobTitle;
    const primarySkill = profile.skills.find(s => s.isPrimary) ?? profile.skills[0];
    if (primarySkill) return primarySkill.name;
    if (profile.industry) return profile.industry;
    return 'developer';
  }, [profile]);

  /**
   * The profile as one short sentence, for embedding — never for a prompt.
   *
   * Written in the user's own words rather than as enum values, because the
   * point of comparing meaning is that it does not need a controlled
   * vocabulary. "Enrolled Nurse, aged care, wound care" carries far more than
   * the canonical "Healthcare" it would be filed under, and an embedding can
   * use all of it.
   *
   * Assembled here, on the client, because the client already has the profile
   * loaded: no database read per search, one place that decides what the
   * profile "is", and nothing stored anywhere that could go stale when someone
   * edits it. Returns null when there is nothing worth comparing, which is
   * what keeps un-onboarded users off the bill entirely.
   */
  const getProfileEmbeddingText = useCallback((): string | null => {
    const parts: string[] = [];

    if (profile.targetJobTitles.length > 0) {
      parts.push(profile.targetJobTitles.slice(0, 3).join(', '));
    }
    if (profile.currentJobTitle) {
      parts.push(`Currently ${profile.currentJobTitle}`);
    }
    if (profile.industry && profile.industry !== 'Other') {
      /* 'Other' is the normalisation fallback, not a sector — it describes our
         list failing rather than anything about this person. */
      parts.push(profile.industry);
    }
    if (profile.skills.length > 0) {
      /* Primary skills first; the tail of a long skill list is mostly noise
         and would dilute the vector. */
      const ordered = [...profile.skills].sort(
        (a, b) => Number(b.isPrimary) - Number(a.isPrimary),
      );
      parts.push(`Skills: ${ordered.slice(0, 12).map((s) => s.name).join(', ')}`);
    }

    if (parts.length === 0) return null;
    /* Matches the server's cap, so nothing is silently truncated mid-word. */
    return parts.join('. ').slice(0, 2000);
  }, [profile]);

  // Get personalized job filters — values shaped for the AU Jobs selects:
  // city values are lowercase ("adelaide"), level is entry/mid/senior/executive.
  const getPersonalizedJobFilters = useCallback(() => {
    const city = (profile.preferredLocations[0] || profile.location || '')
      .split(',')[0]
      .trim()
      .toLowerCase();
    const level = profile.careerLevel
      ? ['entry', 'mid', 'senior'].includes(profile.careerLevel)
        ? profile.careerLevel
        : profile.careerLevel === 'lead'
          ? 'senior'
          : 'executive'
      : 'all';
    return {
      location: city || 'australia',
      jobType: profile.jobPreferences.jobTypes[0] || 'all',
      experienceLevel: level,
      industry: profile.industry || profile.jobPreferences.industries[0] || '',
      minSalary: profile.desiredSalaryMin || profile.jobPreferences.minSalary || 0,
      remotePreference: profile.jobPreferences.remotePreference,
      workArrangement: profile.workArrangement,
    };
  }, [profile]);

  // Check if a job matches user preferences
  const isJobRecommended = useCallback((job: {
    title?: string;
    company?: string;
    salary?: string;
    salaryMin?: number;
    salaryMax?: number;
    /** True when the board predicted this salary instead of the employer stating it. */
    salaryIsPredicted?: boolean;
    location?: string;
    type?: string;
    /** The board's own classification, e.g. "Healthcare & Nursing Jobs". */
    category?: string;
    /** Job title + advert text. Skills are read out of this. */
    description?: string;
    isRemote?: boolean;
    /**
     * Cosine similarity between this job and the user's profile, 0-1, computed
     * server-side. Undefined whenever it could not be: no profile, Horus
     * unavailable, or a page longer than one embedding batch.
     */
    similarity?: number;
  }) => {
    let score = 0;
    const reasons: string[] = [];

    // Check if company is excluded
    if (profile.jobPreferences.excludedCompanies.some(c =>
      job.company?.toLowerCase().includes(c.toLowerCase())
    )) {
      return { isRecommended: false, score: 0, match: 0, band: 'low' as MatchBand, reasons: ['Company excluded'] };
    }

    // Match target job titles
    if (profile.targetJobTitles.some(t => 
      job.title?.toLowerCase().includes(t.toLowerCase())
    )) {
      score += 30;
      reasons.push('Matches your target role');
    }

    // Match current job title (similar role)
    if (profile.currentJobTitle && job.title?.toLowerCase().includes(profile.currentJobTitle.toLowerCase())) {
      score += 20;
      reasons.push('Similar to current role');
    }

    /* ── Skills ───────────────────────────────────────────────────────────
       This branch never ran. It read `job.skills`, a field nothing ever
       populated — the job-search function's schema has no such key — so
       `(job.skills || [])` was always empty and the single most meaningful
       signal for a career changer contributed nothing.

       The fix does not need a new field. The user's own skill names are
       already resolved here (user_skills -> skill_tags), and that list IS the
       vocabulary worth matching: look for those names in the advert text.
       Matching a known list against prose is a very different thing from
       comparing two bags of words — only terms that mean something can hit.

       Two guards the old code lacked:

       - Word boundaries, not substrings. The old test was bidirectional
         `includes`, so a user skill of "R" matched any job skill containing
         the letter r, and "C" matched everything. Skills under two
         characters are skipped outright.
       - A cap. `matchedSkills.length * 10` was unbounded, so a job listing
         fifteen loosely-matching skills scored +150 against +30 for actually
         matching the target role. Many weak skills outranked the right job.
         Four is the most that can count. */
    const haystack = `${job.title || ""} ${job.description || ""}`.toLowerCase();
    const matchedSkills = haystack
      ? profile.skills
          .map(s => s.name)
          .filter(name => {
            const n = name.trim().toLowerCase();
            if (!n) return false;
            const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            /* `+`, `#` and `&` are excluded from the boundary classes, which
               is what makes one-character skills safe to match:
                 - "C++" and "C#" match as themselves, and a bare "C" does not
                   match the C inside them
                 - "R" matches "Excel, R and SQL" but not "our R&D team"
               Verified against those cases before shipping. */
            return new RegExp(`(^|[^a-z0-9+#&])${escaped}([^a-z0-9+#&]|$)`, "i").test(haystack);
          })
      : [];
    if (matchedSkills.length > 0) {
      const counted = Math.min(matchedSkills.length, 4);
      score += counted * 10;
      reasons.push(
        `${matchedSkills.length} of your skill${matchedSkills.length > 1 ? 's' : ''} mentioned`,
      );
    }

    // Match location
    if (profile.preferredLocations.some(loc => 
      job.location?.toLowerCase().includes(loc.toLowerCase())
    )) {
      score += 15;
      reasons.push('Preferred location');
    }

    // Match remote preference
    if (profile.jobPreferences.remotePreference === 'remote' && job.isRemote) {
      score += 20;
      reasons.push('Remote work available');
    }

    /* ── Salary ───────────────────────────────────────────────────────────
       Only score a salary the employer actually stated. Adzuna predicts a
       range for ads that do not quote one and flags it with
       `salary_is_predicted`; this used to award the full +15 either way, so a
       machine's guess could satisfy the user's real salary floor. A predicted
       range still counts for something — it is a reasonable signal about the
       role — but it should not carry the same weight as a published figure,
       and it must not claim the ad "meets" anything. */
    const jobSalaryMin = job.salaryMin || 0;
    if (profile.desiredSalaryMin && jobSalaryMin >= profile.desiredSalaryMin) {
      if (job.salaryIsPredicted) {
        score += 7;
        reasons.push('Estimated pay is in range');
      } else {
        score += 15;
        reasons.push('Meets salary expectations');
      }
    }

    /* ── Industry ─────────────────────────────────────────────────────────
       This tested the industry name against the job TITLE, which almost never
       contains it — "Healthcare" does not appear in "Registered Nurse - Ward
       3B" — so the signal was very nearly dead too. The board's own
       `category` field is what classifies a posting ("Healthcare & Nursing
       Jobs"), so check that first and keep the title as a fallback. */
    if (profile.industry) {
      if (industryMatches(profile.industry, job.category, job.title)) {
        score += 10;
        reasons.push('Industry match');
      }
    }

    /* ── Closeness to the user's background ───────────────────────────────
       Every other signal above is a yes/no: the title contains the target
       role or it does not, the city matches or it does not. That is why a
       career changer scores badly — nothing they are moving *towards* is in
       their profile yet, and nothing in the list can see that an enrolled
       nurse and a patient care assistant do similar work.

       This one is continuous on purpose, and there is no threshold anywhere
       in it. A cut-off would put one arbitrary constant in charge of what
       counts as a related job, which is the fixed-list problem wearing a
       different hat — the entire reason for measuring meaning was that no
       constant knows in advance what a career change looks like. A job that
       scores poorly simply contributes less. Nothing is ever excluded.

       The window maps raw cosine onto that contribution. Embeddings of short
       job text do not use the full 0-1 range — unrelated pairs sit well above
       zero and near-identical ones well below one — so the raw number would
       hand almost everything a middling score and separate nothing. These
       bounds are a starting point, not a measurement: job-news logs the min,
       median and max of every batch so they can be set from real spreads
       rather than guessed at twice. */
    const simPoints = similarityPoints(job.similarity, SIMILARITY_MAX_POINTS);
    if (simPoints > 0) {
      score += simPoints;
      /* Only the top of the range earns a sentence. Below that the points
         still count — they just do not warrant a claim to the reader. */
      if (simPoints > SIMILARITY_MAX_POINTS * 0.6) reasons.push('Close to your background');
    }

    return {
      isRecommended: score >= 20,
      score,
      ...matchLevel(score),
      reasons,
    };
  }, [profile]);

  // Rate how relevant a news/market item is to this profile (same 0–100 scale).
  const scoreArticle = useCallback((article: {
    title?: string;
    description?: string;
    category?: string;
    /** Closeness to the user's profile, 0-1, computed server-side. */
    similarity?: number;
  }) => {
    const text = `${article.title || ''} ${article.description || ''} ${article.category || ''}`.toLowerCase();
    let score = 0;
    const reasons: string[] = [];

    const industries = [
      profile.industry,
      ...profile.jobPreferences.industries,
      ...profile.newsPreferences.followedIndustries,
    ].filter(Boolean) as string[];
    if (industries.some((i) => text.includes(i.toLowerCase()))) {
      score += 25;
      reasons.push('Your industry');
    }

    if (profile.targetJobTitles.some((t) => t && text.includes(t.toLowerCase()))) {
      score += 20;
      reasons.push('Your target role');
    }

    const companies = [...profile.targetCompanies, ...profile.newsPreferences.followedCompanies].filter(Boolean);
    if (companies.some((c) => text.includes(c.toLowerCase()))) {
      score += 18;
      reasons.push('A company you follow');
    }

    const skillNames = profile.skills.map((s) => s.name.toLowerCase()).filter((n) => n.length > 2);
    const matched = skillNames.filter((s) => text.includes(s));
    if (matched.length) {
      score += Math.min(matched.length * 8, 24);
      reasons.push(`${matched.length} skill${matched.length > 1 ? 's' : ''} mentioned`);
    }

    if (profile.currentJobTitle && text.includes(profile.currentJobTitle.toLowerCase())) {
      score += 12;
      reasons.push('Your current role');
    }

    /* Same graded treatment as jobs, and for the same reason: every signal
       above needs the article to literally contain a word from the profile, so
       a piece about aged-care workforce shortages is invisible to a nurse whose
       profile says "Registered Nurse". Capped lower than on jobs — an article
       being *about* your field matters less than a job you could apply for. */
    const articleSimPoints = similarityPoints(article.similarity, SIMILARITY_MAX_POINTS_ARTICLE);
    if (articleSimPoints > 0) {
      score += articleSimPoints;
      if (articleSimPoints > SIMILARITY_MAX_POINTS_ARTICLE * 0.6) {
        reasons.push('Close to your field');
      }
    }

    return { isRelevant: score >= 18, score, ...matchLevel(score), reasons };
  }, [profile]);

  // Market widgets — rate a single skill / industry / company against the profile.
  const scoreSkill = useCallback((skill: string) => {
    const s = skill.trim().toLowerCase();
    let score = 0;
    const reasons: string[] = [];
    if (s && profile.skills.some((k) => { const n = k.name.toLowerCase(); return n === s || n.includes(s) || s.includes(n); })) {
      score = 55;
      reasons.push('You have this skill');
    } else if (s && (profile.targetJobTitles.some((t) => t.toLowerCase().includes(s)) || profile.currentJobTitle?.toLowerCase().includes(s))) {
      score = 22;
      reasons.push('Relevant to your roles');
    }
    return { score, ...matchLevel(score), reasons };
  }, [profile]);

  const scoreIndustry = useCallback((industry: string) => {
    const s = industry.trim().toLowerCase();
    const mine = [profile.industry, ...profile.jobPreferences.industries, ...profile.newsPreferences.followedIndustries].filter(Boolean) as string[];
    let score = 0;
    const reasons: string[] = [];
    if (s && mine.some((i) => { const n = i.toLowerCase(); return n === s || n.includes(s) || s.includes(n); })) {
      score = 60;
      reasons.push('Your industry');
    }
    return { score, ...matchLevel(score), reasons };
  }, [profile]);

  const scoreCompany = useCallback((company: string) => {
    const s = company.trim().toLowerCase();
    const mine = [...profile.targetCompanies, ...profile.newsPreferences.followedCompanies].filter(Boolean);
    let score = 0;
    const reasons: string[] = [];
    if (s && mine.some((c) => { const n = c.toLowerCase(); return n === s || n.includes(s) || s.includes(n); })) {
      score = 60;
      reasons.push('A company you follow');
    }
    return { score, ...matchLevel(score), reasons };
  }, [profile]);

  // Get resume auto-fill data
  const getResumeAutoFillData = useCallback(() => {
    return {
      contact: {
        name: profile.fullName || '',
        email: profile.email || '',
        phone: profile.phone || '',
        location: profile.location || '',
        linkedin: '', // Not stored in profile yet
        website: '',
      },
      summary: profile.bio || profile.headline || '',
      skills: profile.skills.map(s => s.name),
      experience: profile.currentJobTitle && profile.currentCompany ? [{
        id: 'current',
        title: profile.currentJobTitle,
        company: profile.currentCompany,
        location: profile.location || '',
        startDate: '',
        endDate: 'Present',
        current: true,
        bullets: [],
      }] : [],
      certifications: profile.certifications.map(c => ({
        name: c.name,
        issuer: c.issuer || '',
        date: c.issueDate || '',
      })),
    };
  }, [profile]);

  // Get interview prep defaults
  const getInterviewDefaults = useCallback(() => {
    return {
      field: profile.interviewPreferences.defaultField || profile.industry?.toLowerCase() || 'general',
      difficulty: profile.interviewPreferences.defaultDifficulty,
      questionTypes: profile.interviewPreferences.questionTypes,
      focusAreas: profile.interviewPreferences.focusAreas.length > 0 
        ? profile.interviewPreferences.focusAreas 
        : profile.skills.filter(s => s.isPrimary).map(s => s.name),
      sessionDuration: profile.interviewPreferences.sessionDuration,
    };
  }, [profile]);

  // Get news preferences for filtering
  const getNewsFilters = useCallback(() => {
    return {
      industries: profile.newsPreferences.followedIndustries.length > 0
        ? profile.newsPreferences.followedIndustries
        : profile.industry ? [profile.industry] : [],
      companies: profile.newsPreferences.followedCompanies.length > 0
        ? profile.newsPreferences.followedCompanies
        : profile.targetCompanies,
      contentTypes: profile.newsPreferences.contentTypes,
    };
  }, [profile]);

  // Check if profile has enough data for personalization
  const hasPersonalizationData = useMemo(() => {
    return (
      profile.isLoaded && (
        profile.currentJobTitle ||
        profile.targetJobTitles.length > 0 ||
        profile.skills.length > 0 ||
        profile.industry
      )
    );
  }, [profile]);

  // Get personalization summary for UI
  const getPersonalizationSummary = useCallback(() => {
    const items: string[] = [];
    
    if (profile.targetJobTitles.length > 0) {
      items.push(`Looking for: ${profile.targetJobTitles.slice(0, 2).join(', ')}`);
    }
    if (profile.industry) {
      items.push(`Industry: ${profile.industry}`);
    }
    if (profile.skills.length > 0) {
      const topSkills = profile.skills.filter(s => s.isPrimary).slice(0, 3);
      if (topSkills.length > 0) {
        items.push(`Top skills: ${topSkills.map(s => s.name).join(', ')}`);
      }
    }
    if (profile.preferredLocations.length > 0) {
      items.push(`Location: ${profile.preferredLocations[0]}`);
    }
    
    return items;
  }, [profile]);

  return {
    profile,
    loading,
    userId,
    hasPersonalizationData,
    refetch: fetchProfile,
    
    // Job personalization
    getPersonalizedJobQuery,
    getProfileEmbeddingText,
    getPersonalizedJobFilters,
    isJobRecommended,
    
    // Resume auto-fill
    getResumeAutoFillData,
    
    // Interview prep
    getInterviewDefaults,
    
    // News
    getNewsFilters,
    scoreArticle,

    // Market widgets
    scoreSkill,
    scoreIndustry,
    scoreCompany,
    
    // UI helpers
    getPersonalizationSummary,
  };
}

export default usePersonalization;
