import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  targetCompanies: string[];
  desiredSalaryMin: number | null;
  desiredSalaryMax: number | null;
  desiredSalaryCurrency: string;
  workArrangement: string[];
  preferredLocations: string[];
  jobChangeTimeline: string | null;
  
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
  targetCompanies: [],
  desiredSalaryMin: null,
  desiredSalaryMax: null,
  desiredSalaryCurrency: 'AUD',
  workArrangement: [],
  preferredLocations: [],
  jobChangeTimeline: null,
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
        targetCompanies: profileData?.target_companies || [],
        desiredSalaryMin: profileData?.desired_salary_min || null,
        desiredSalaryMax: profileData?.desired_salary_max || null,
        desiredSalaryCurrency: profileData?.desired_salary_currency || 'AUD',
        workArrangement: profileData?.work_arrangement || [],
        preferredLocations: profileData?.preferred_locations || [],
        jobChangeTimeline: profileData?.job_change_timeline || null,
        skills: (skillsData || []).map(s => ({
          id: s.id,
          name: s.skill_id || 'Unknown Skill',
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
    } catch (error) {
      console.error('Error fetching personalization data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Get personalized job search query based on profile
  const getPersonalizedJobQuery = useCallback(() => {
    const queries: string[] = [];
    
    // Add target job titles
    if (profile.targetJobTitles.length > 0) {
      queries.push(...profile.targetJobTitles.slice(0, 2));
    }
    
    // Add current job title if no targets
    if (queries.length === 0 && profile.currentJobTitle) {
      queries.push(profile.currentJobTitle);
    }
    
    // Add primary skills
    const primarySkills = profile.skills.filter(s => s.isPrimary).slice(0, 2);
    if (primarySkills.length > 0) {
      queries.push(...primarySkills.map(s => s.name));
    }
    
    // Fallback
    if (queries.length === 0) {
      return 'developer'; // Default search
    }
    
    return queries.join(' OR ');
  }, [profile]);

  // Get personalized job filters
  const getPersonalizedJobFilters = useCallback(() => {
    return {
      location: profile.preferredLocations[0] || 'australia',
      jobType: profile.jobPreferences.jobTypes[0] || 'all',
      experienceLevel: profile.careerLevel || 'all',
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
      return { isRecommended: false, score: 0, reasons: ['Company excluded'] };
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
      reasons,
    };
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
    
    // UI helpers
    getPersonalizationSummary,
  };
}

export default usePersonalization;
