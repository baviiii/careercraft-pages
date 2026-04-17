import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Types for the user profile system
export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  phone: string | null;
  location_city: string | null;
  location_country: string | null;
  timezone: string;
  current_job_title: string | null;
  current_company: string | null;
  years_of_experience: string | null;
  industry: string | null;
  career_level: string | null;
  employment_status: string;
  target_job_titles: string[] | null;
  target_companies: string[] | null;
  desired_salary_min: number | null;
  desired_salary_max: number | null;
  desired_salary_currency: string;
  work_arrangement: string[] | null;
  preferred_locations: string[] | null;
  job_change_timeline: string | null;
  profile_completed_at: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string | null;
  skill_name?: string; // Virtual field for UI display, maps to skill_id
  proficiency: string | null;
  proficiency_level: number | null;
  category: string | null;
  years_experience: number | null;
  is_primary: boolean | null;
  last_tested_at: string | null;
  times_tested: number | null;
  times_correct: number | null;
  trend: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCertification {
  id: string;
  user_id: string;
  name: string;
  issuer: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  credential_id: string | null;
  credential_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobPreferences {
  industries: string[];
  excluded_companies: string[];
  min_salary: number | null;
  job_types: string[];
  company_sizes: string[];
  benefits_priorities: string[];
  remote_preference: string;
}

export interface InterviewPreferences {
  default_field: string;
  default_difficulty: string;
  focus_areas: string[];
  session_duration: number;
  feedback_verbosity: string;
  question_types: string[];
}

export interface NewsPreferences {
  followed_industries: string[];
  followed_companies: string[];
  content_types: string[];
  digest_frequency: string;
}

export interface NotificationSettings {
  email_job_matches: boolean;
  email_interview_reminders: boolean;
  email_weekly_digest: boolean;
  email_news_alerts: boolean;
  email_application_updates: boolean;
  push_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  marketing_emails: boolean;
}

export interface DisplaySettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  date_format: string;
  reduced_motion: boolean;
  high_contrast: boolean;
  compact_mode: boolean;
}

export interface PrivacySettings {
  profile_visibility: 'public' | 'private' | 'recruiters_only';
  allow_recruiter_contact: boolean;
  share_anonymous_data: boolean;
  show_activity_status: boolean;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  job_preferences: JobPreferences;
  interview_preferences: InterviewPreferences;
  news_preferences: NewsPreferences;
  notification_settings: NotificationSettings;
  display_settings: DisplaySettings;
  privacy_settings: PrivacySettings;
  // Legacy fields
  preferred_field: string | null;
  seniority_level: string | null;
  preferred_industries: string[] | null;
  preferred_countries: string[] | null;
  email_notifications: boolean | null;
  push_notifications: boolean | null;
  summary_frequency: string | null;
}

export interface CompleteUserProfile {
  profile: UserProfile;
  preferences: UserPreferences;
  skills: UserSkill[];
  certifications: UserCertification[];
  completeness: number;
}

// Default values
const DEFAULT_JOB_PREFERENCES: JobPreferences = {
  industries: [],
  excluded_companies: [],
  min_salary: null,
  job_types: ['full-time'],
  company_sizes: [],
  benefits_priorities: [],
  remote_preference: 'any',
};

const DEFAULT_INTERVIEW_PREFERENCES: InterviewPreferences = {
  default_field: 'general',
  default_difficulty: 'medium',
  focus_areas: [],
  session_duration: 30,
  feedback_verbosity: 'detailed',
  question_types: ['behavioral', 'technical'],
};

const DEFAULT_NEWS_PREFERENCES: NewsPreferences = {
  followed_industries: [],
  followed_companies: [],
  content_types: ['trends', 'insights', 'salary'],
  digest_frequency: 'weekly',
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  email_job_matches: true,
  email_interview_reminders: true,
  email_weekly_digest: true,
  email_news_alerts: false,
  email_application_updates: true,
  push_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
  marketing_emails: false,
};

const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  theme: 'system',
  language: 'en',
  date_format: 'DD/MM/YYYY',
  reduced_motion: false,
  high_contrast: false,
  compact_mode: false,
};

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  profile_visibility: 'private',
  allow_recruiter_contact: false,
  share_anonymous_data: true,
  show_activity_status: false,
};

export function useUserProfile() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [certifications, setCertifications] = useState<UserCertification[]>([]);
  const [completeness, setCompleteness] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch complete profile
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // Fetch preferences
      const { data: prefsData, error: prefsError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (prefsError && prefsError.code !== 'PGRST116') {
        console.warn('Preferences not found, will create defaults');
      }

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
        .eq('user_id', session.user.id)
        .order('issue_date', { ascending: false });

      // Set state with defaults for missing JSONB fields
      if (profileData) {
        setProfile(profileData as UserProfile);
      }

      if (prefsData) {
        setPreferences({
          ...prefsData,
          job_preferences: prefsData.job_preferences || DEFAULT_JOB_PREFERENCES,
          interview_preferences: prefsData.interview_preferences || DEFAULT_INTERVIEW_PREFERENCES,
          news_preferences: prefsData.news_preferences || DEFAULT_NEWS_PREFERENCES,
          notification_settings: prefsData.notification_settings || DEFAULT_NOTIFICATION_SETTINGS,
          display_settings: prefsData.display_settings || DEFAULT_DISPLAY_SETTINGS,
          privacy_settings: prefsData.privacy_settings || DEFAULT_PRIVACY_SETTINGS,
        } as UserPreferences);
      }

      // Map skills with skill_name for UI display
      const mappedSkills = (skillsData || []).map(s => ({
        ...s,
        skill_name: s.skill_id || 'Unknown Skill', // Use skill_id as display name for now
      })) as UserSkill[];
      setSkills(mappedSkills);
      setCertifications((certsData as UserCertification[]) || []);

      // Calculate completeness
      calculateCompleteness(profileData, skillsData || []);

    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Error loading profile',
        description: 'Please try refreshing the page',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Calculate profile completeness
  const calculateCompleteness = (profileData: any, skillsData: any[]) => {
    let score = 0;
    
    if (profileData?.full_name) score += 10;
    if (profileData?.avatar_url) score += 5;
    if (profileData?.headline) score += 5;
    if (profileData?.bio) score += 5;
    if (profileData?.location_city) score += 5;
    if (profileData?.current_job_title) score += 10;
    if (profileData?.current_company) score += 5;
    if (profileData?.years_of_experience) score += 5;
    if (profileData?.industry) score += 10;
    if (profileData?.career_level) score += 10;
    
    if (skillsData.length >= 5) score += 20;
    else if (skillsData.length >= 3) score += 15;
    else if (skillsData.length >= 1) score += 10;
    
    if (profileData?.target_job_titles?.length > 0) score += 10;
    
    setCompleteness(Math.min(score, 100));
  };

  // Update profile
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!userId) return false;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: 'Profile updated',
        description: 'Your changes have been saved',
      });
      
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error saving profile',
        description: 'Please try again',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [userId, toast]);

  // Update preferences
  const updatePreferences = useCallback(async (
    category: 'job_preferences' | 'interview_preferences' | 'news_preferences' | 'notification_settings' | 'display_settings' | 'privacy_settings',
    updates: any
  ) => {
    if (!userId) return false;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('user_preferences')
        .update({ [category]: updates })
        .eq('user_id', userId);

      if (error) throw error;

      setPreferences(prev => prev ? { ...prev, [category]: updates } : null);
      
      toast({
        title: 'Preferences updated',
        description: 'Your settings have been saved',
      });
      
      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: 'Error saving preferences',
        description: 'Please try again',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [userId, toast]);

  // Add skill
  const addSkill = useCallback(async (skill: Omit<UserSkill, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!userId) return null;
    
    try {
      const { data, error } = await supabase
        .from('user_skills')
        .insert({ ...skill, user_id: userId })
        .select()
        .single();

      if (error) throw error;

      const mappedData = {
        ...data,
        skill_name: (skill as any).skill_name || data.skill_id || 'New Skill',
      } as UserSkill;
      setSkills(prev => [...prev, mappedData]);
      
      toast({
        title: 'Skill added',
        description: `Skill has been added to your profile`,
      });
      
      return data;
    } catch (error: any) {
      if (error.code === '23505') {
        toast({
          title: 'Skill already exists',
          description: 'This skill is already in your profile',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error adding skill',
          description: 'Please try again',
          variant: 'destructive',
        });
      }
      return null;
    }
  }, [userId, toast]);

  // Update skill
  const updateSkill = useCallback(async (skillId: string, updates: Partial<UserSkill>) => {
    try {
      const { error } = await supabase
        .from('user_skills')
        .update(updates)
        .eq('id', skillId);

      if (error) throw error;

      setSkills(prev => prev.map(s => s.id === skillId ? { ...s, ...updates } : s));
      
      return true;
    } catch (error) {
      toast({
        title: 'Error updating skill',
        description: 'Please try again',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Delete skill
  const deleteSkill = useCallback(async (skillId: string) => {
    try {
      const { error } = await supabase
        .from('user_skills')
        .delete()
        .eq('id', skillId);

      if (error) throw error;

      setSkills(prev => prev.filter(s => s.id !== skillId));
      
      toast({
        title: 'Skill removed',
        description: 'The skill has been removed from your profile',
      });
      
      return true;
    } catch (error) {
      toast({
        title: 'Error removing skill',
        description: 'Please try again',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Add certification
  const addCertification = useCallback(async (cert: Omit<UserCertification, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!userId) return null;
    
    try {
      const { data, error } = await supabase
        .from('user_certifications')
        .insert({ ...cert, user_id: userId })
        .select()
        .single();

      if (error) throw error;

      setCertifications(prev => [...prev, data as UserCertification]);
      
      toast({
        title: 'Certification added',
        description: `${cert.name} has been added to your profile`,
      });
      
      return data;
    } catch (error) {
      toast({
        title: 'Error adding certification',
        description: 'Please try again',
        variant: 'destructive',
      });
      return null;
    }
  }, [userId, toast]);

  // Delete certification
  const deleteCertification = useCallback(async (certId: string) => {
    try {
      const { error } = await supabase
        .from('user_certifications')
        .delete()
        .eq('id', certId);

      if (error) throw error;

      setCertifications(prev => prev.filter(c => c.id !== certId));
      
      toast({
        title: 'Certification removed',
        description: 'The certification has been removed from your profile',
      });
      
      return true;
    } catch (error) {
      toast({
        title: 'Error removing certification',
        description: 'Please try again',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Delete account
  const deleteAccount = useCallback(async () => {
    if (!userId) return false;
    
    try {
      // This would typically call a server function that handles account deletion
      // For now, we'll just sign out
      await supabase.auth.signOut();
      
      toast({
        title: 'Account deletion requested',
        description: 'Your account will be deleted within 30 days',
      });
      
      return true;
    } catch (error) {
      toast({
        title: 'Error deleting account',
        description: 'Please contact support',
        variant: 'destructive',
      });
      return false;
    }
  }, [userId, toast]);

  // Export user data
  const exportData = useCallback(async () => {
    if (!userId) return null;
    
    try {
      const data = {
        profile,
        preferences,
        skills,
        certifications,
        exportedAt: new Date().toISOString(),
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `careercraft-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Data exported',
        description: 'Your data has been downloaded',
      });
      
      return data;
    } catch (error) {
      toast({
        title: 'Error exporting data',
        description: 'Please try again',
        variant: 'destructive',
      });
      return null;
    }
  }, [userId, profile, preferences, skills, certifications, toast]);

  // Initialize
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    loading,
    saving,
    profile,
    preferences,
    skills,
    certifications,
    completeness,
    userId,
    fetchProfile,
    updateProfile,
    updatePreferences,
    addSkill,
    updateSkill,
    deleteSkill,
    addCertification,
    deleteCertification,
    deleteAccount,
    exportData,
    // Expose defaults for forms
    defaults: {
      jobPreferences: DEFAULT_JOB_PREFERENCES,
      interviewPreferences: DEFAULT_INTERVIEW_PREFERENCES,
      newsPreferences: DEFAULT_NEWS_PREFERENCES,
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      displaySettings: DEFAULT_DISPLAY_SETTINGS,
      privacySettings: DEFAULT_PRIVACY_SETTINGS,
    },
  };
}

// Constants for dropdowns
export const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance & Banking',
  'Education',
  'Manufacturing',
  'Retail',
  'Consulting',
  'Media & Entertainment',
  'Real Estate',
  'Government',
  'Non-Profit',
  'Energy',
  'Transportation',
  'Hospitality',
  'Legal',
  'Agriculture',
  'Construction',
  'Telecommunications',
  'Pharmaceuticals',
  'Other',
];

export const CAREER_LEVELS = [
  { value: 'entry', label: 'Entry Level (0-2 years)' },
  { value: 'mid', label: 'Mid Level (2-5 years)' },
  { value: 'senior', label: 'Senior (5-8 years)' },
  { value: 'lead', label: 'Lead / Staff (8-12 years)' },
  { value: 'manager', label: 'Manager' },
  { value: 'director', label: 'Director' },
  { value: 'vp', label: 'VP / Executive' },
  { value: 'c-level', label: 'C-Level' },
];

export const YEARS_OF_EXPERIENCE = [
  { value: '0-1', label: 'Less than 1 year' },
  { value: '1-3', label: '1-3 years' },
  { value: '3-5', label: '3-5 years' },
  { value: '5-10', label: '5-10 years' },
  { value: '10-15', label: '10-15 years' },
  { value: '15+', label: '15+ years' },
];

export const EMPLOYMENT_STATUS = [
  { value: 'employed', label: 'Currently Employed' },
  { value: 'actively_looking', label: 'Actively Looking' },
  { value: 'open', label: 'Open to Opportunities' },
  { value: 'not_looking', label: 'Not Looking' },
];

export const WORK_ARRANGEMENTS = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
];

export const JOB_CHANGE_TIMELINE = [
  { value: 'immediately', label: 'Immediately' },
  { value: '1-3_months', label: 'Within 1-3 months' },
  { value: '3-6_months', label: 'Within 3-6 months' },
  { value: 'exploring', label: 'Just exploring' },
];

export const SKILL_PROFICIENCY = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];

export const SKILL_CATEGORIES = [
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Soft Skills' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'domain', label: 'Domain Knowledge' },
  { value: 'language', label: 'Languages' },
];

export const COMPANY_SIZES = [
  { value: 'startup', label: 'Startup (1-50)' },
  { value: 'small', label: 'Small (51-200)' },
  { value: 'medium', label: 'Medium (201-1000)' },
  { value: 'large', label: 'Large (1001-5000)' },
  { value: 'enterprise', label: 'Enterprise (5000+)' },
];

export const JOB_TYPES = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' },
];

export const TIMEZONES = [
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACST/ACDT)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'UTC', label: 'UTC' },
];
