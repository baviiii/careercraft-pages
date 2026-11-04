// Data layer for the admin Plans & Limits screen.
//
// Follows the hand-rolled hook convention used everywhere else in this app
// (useUserProfile, useAdminData): useState + useCallback + direct supabase
// calls, each mutation returning a boolean and toasting on both paths.
// react-query is installed and provided in App.tsx but is not used anywhere,
// so this deliberately does not introduce it.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Plan {
  key: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
  max_model_tier: string;
  max_tokens_per_call: number;
  daily_token_ceiling: number | null;
  price_cents_monthly: number;
  price_cents_yearly: number;
  currency: string;
  marketing_features: unknown;
  marketing_limitations: unknown;
}

export interface PlanLimit {
  plan_key: string;
  resource: string;
  label: string;
  is_enabled: boolean;
  monthly_limit: number | null;
  hourly_limit: number | null;
  max_model_tier: string | null;
  max_tokens_per_call: number | null;
}

export interface UserSubscriptionRow {
  user_id: string;
  plan_key: string;
  status: string;
  source: string;
  current_period_end: string | null;
  grant_note: string | null;
  updated_at: string;
}

export interface LimitOverride {
  user_id: string;
  resource: string;
  is_enabled: boolean | null;
  monthly_limit: number | null;
  hourly_limit: number | null;
  expires_at: string | null;
  reason: string | null;
}

/**
 * -1 is the "explicitly unlimited" sentinel; NULL means inherit. Both render
 * as something a human can read rather than a bare number.
 */
export function formatLimit(value: number | null): string {
  if (value === null) return 'Inherit';
  if (value === -1) return 'Unlimited';
  return String(value);
}

/** Parses the admin's input back into the sentinel convention. */
export function parseLimit(raw: string): number | null {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === '' || trimmed === 'inherit') return null;
  if (trimmed === 'unlimited' || trimmed === '-1' || trimmed === '∞') return -1;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

export function usePlansAdmin() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [limits, setLimits] = useState<PlanLimit[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscriptionRow[]>([]);
  const [overrides, setOverrides] = useState<LimitOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, l, s, o] = await Promise.all([
        supabase.from('plans').select('*').order('sort_order'),
        supabase.from('plan_limits').select('*').order('label'),
        supabase.from('user_subscriptions').select('*').order('updated_at', { ascending: false }),
        supabase.from('user_limit_overrides').select('*'),
      ]);

      if (p.error) throw p.error;
      if (l.error) throw l.error;
      if (s.error) throw s.error;
      if (o.error) throw o.error;

      setPlans((p.data ?? []) as Plan[]);
      setLimits((l.data ?? []) as PlanLimit[]);
      setSubscriptions((s.data ?? []) as UserSubscriptionRow[]);
      setOverrides((o.data ?? []) as LimitOverride[]);
    } catch (err) {
      console.error('Error loading plans:', err);
      toast.error('Failed to load plans and limits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updatePlan = useCallback(async (key: string, patch: Partial<Plan>): Promise<boolean> => {
    setSaving(true);
    try {
      const { error } = await supabase.from('plans').update(patch).eq('key', key);
      if (error) throw error;
      setPlans((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
      toast.success(`Plan "${key}" updated`);
      return true;
    } catch (err) {
      console.error('Error updating plan:', err);
      toast.error('Failed to update plan');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const updateLimit = useCallback(async (
    planKey: string,
    resource: string,
    patch: Partial<PlanLimit>,
  ): Promise<boolean> => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('plan_limits')
        .update(patch)
        .eq('plan_key', planKey)
        .eq('resource', resource);
      if (error) throw error;
      setLimits((prev) =>
        prev.map((l) =>
          l.plan_key === planKey && l.resource === resource ? { ...l, ...patch } : l,
        ),
      );
      toast.success(`Limit updated for ${resource}`);
      return true;
    } catch (err) {
      console.error('Error updating limit:', err);
      toast.error('Failed to update limit');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  /**
   * Move a user onto a plan and record why.
   *
   * Goes through admin_set_user_plan rather than writing the tables: the
   * browser has no write privilege on user_subscriptions (deliberately — no
   * session should be able to grant itself a plan), and the RPC writes the
   * plan and its history row together. It records source 'admin_grant', so a
   * comped account is never mistaken for a paying one.
   */
  const setUserPlan = useCallback(async (
    userId: string,
    planKey: string,
    note?: string,
  ): Promise<boolean> => {
    setSaving(true);
    try {
      const { error } = await supabase.rpc('admin_set_user_plan', {
        p_user_id: userId,
        p_plan_key: planKey,
        p_note: note ?? null,
      });
      if (error) throw error;

      toast.success(`Plan set to ${planKey}`);
      await fetchAll();
      return true;
    } catch (err) {
      console.error('Error setting user plan:', err);
      toast.error('Failed to set plan');
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchAll]);

  const upsertOverride = useCallback(async (
    override: LimitOverride,
  ): Promise<boolean> => {
    setSaving(true);
    try {
      const { error } = await supabase.rpc('admin_set_limit_override', {
        p_user_id: override.user_id,
        p_resource: override.resource,
        p_is_enabled: override.is_enabled,
        p_monthly_limit: override.monthly_limit,
        p_hourly_limit: override.hourly_limit,
        p_expires_at: override.expires_at,
        p_reason: override.reason,
      });
      if (error) throw error;
      toast.success('Override saved');
      await fetchAll();
      return true;
    } catch (err) {
      console.error('Error saving override:', err);
      toast.error('Failed to save override');
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchAll]);

  const removeOverride = useCallback(async (
    userId: string,
    resource: string,
  ): Promise<boolean> => {
    setSaving(true);
    try {
      const { error } = await supabase.rpc('admin_remove_limit_override', {
        p_user_id: userId,
        p_resource: resource,
      });
      if (error) throw error;
      setOverrides((prev) =>
        prev.filter((o) => !(o.user_id === userId && o.resource === resource)),
      );
      toast.success('Override removed');
      return true;
    } catch (err) {
      console.error('Error removing override:', err);
      toast.error('Failed to remove override');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    plans,
    limits,
    subscriptions,
    overrides,
    loading,
    saving,
    fetchAll,
    updatePlan,
    updateLimit,
    setUserPlan,
    upsertOverride,
    removeOverride,
  };
}
