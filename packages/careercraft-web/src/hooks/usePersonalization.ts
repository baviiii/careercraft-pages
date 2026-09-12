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
    location?: string;
    type?: string;
    skills?: string[];
    isRemote?: boolean;
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

    // Match skills
    const userSkillNames = profile.skills.map(s => s.name.toLowerCase());
    const matchedSkills = (job.skills || []).filter(s => 
      userSkillNames.some(us => s.toLowerCase().includes(us) || us.includes(s.toLowerCase()))
    );
    if (matchedSkills.length > 0) {
      score += matchedSkills.length * 10;
      reasons.push(`${matchedSkills.length} skill${matchedSkills.length > 1 ? 's' : ''} match`);
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

    // Match salary
    const jobSalaryMin = job.salaryMin || 0;
    if (profile.desiredSalaryMin && jobSalaryMin >= profile.desiredSalaryMin) {
      score += 15;
      reasons.push('Meets salary expectations');
    }

    // Match industry
    if (profile.industry && job.title?.toLowerCase().includes(profile.industry.toLowerCase())) {
      score += 10;
      reasons.push('Industry match');
    }

    return {
      isRecommended: score >= 20,
      score,
      ...matchLevel(score),
      reasons,
    };
  }, [profile]);

  // Rate how relevant a news/market item is to this profile (same 0–100 scale).
  const scoreArticle = useCallback((article: { title?: string; description?: string; category?: string }) => {
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
