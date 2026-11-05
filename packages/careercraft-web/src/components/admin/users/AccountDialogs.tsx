// The dialogs behind every admin action on an account: ban, delete, change
// admin access, and block an IP or range. Each one says plainly what will
// happen before it happens.

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMyIp } from '@/hooks/useMyIp';
import {
  BAN_DURATIONS,
  accountAction,
  blockIp,
  errorMessage,
  fetchNetworkAccounts,
  ipResultText,
  setAdmin,
  type BanDuration,
  type NetworkAccount,
} from '@/lib/adminUsers';
import { ipInNetwork } from './ipMatch';

export interface DialogTarget {
  user_id: string;
  email: string | null;
}

interface BaseProps {
  target: DialogTarget | null;
  onClose: () => void;
  /** Called after the action succeeded, to refresh whatever is on screen. */
  onDone: () => void;
}

function sessionsNote(n: number | undefined): string {
  if (n === undefined) return '';
  if (n < 0) return ' Their current session ends when its token expires (within an hour).';
  return n === 1 ? ' 1 session ended.' : ` ${n} sessions ended.`;
}

// ── Ban ────────────────────────────────────────────────────────────────────

export function BanDialog({ target, onClose, onDone }: BaseProps) {
  const [duration, setDuration] = useState<BanDuration>('7d');
  const [reason, setReason] = useState('');
  const [alsoIps, setAlsoIps] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (target) {
      setDuration('7d');
      setReason('');
      setAlsoIps(false);
    }
  }, [target]);

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    try {
      const r = await accountAction({
        action: 'ban',
        userId: target.user_id,
        duration,
        reason: reason.trim(),
        blockIps: alsoIps,
      });
      const ips = r.ips ? ipResultText(r.ips) : '';
      toast.success(`${target.email} is banned.${sessionsNote(r.sessionsEnded)}${ips}`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, 'Couldn\'t ban the account'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(target)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Ban {target?.email}</DialogTitle>
          <DialogDescription>
            They're signed out now and can't sign back in until the ban ends. Every AI
            feature refuses them straight away.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>How long</Label>
            <Select value={duration} onValueChange={(v) => setDuration(v as BanDuration)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BAN_DURATIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reason (kept in the log)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. abusing the interview coach with scripted requests"
              rows={3}
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={alsoIps} onCheckedChange={(v) => setAlsoIps(v === true)} className="mt-0.5" />
            <span>
              Also block the IP addresses only they have used
              <span className="block text-xs text-muted-foreground">
                Addresses other accounts share are left open. Block those from the account's page if you need to.
              </span>
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={busy || !reason.trim()}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ban account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete ─────────────────────────────────────────────────────────────────

export function DeleteDialog({ target, onClose, onDone }: BaseProps) {
  const [typed, setTyped] = useState('');
  const [reason, setReason] = useState('');
  const [alsoIps, setAlsoIps] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (target) {
      setTyped('');
      setReason('');
      setAlsoIps(false);
    }
  }, [target]);

  const matches = Boolean(target?.email) && typed.trim().toLowerCase() === target?.email?.toLowerCase();

  const submit = async () => {
    if (!target || !matches) return;
    setBusy(true);
    try {
      const r = await accountAction({
        action: 'delete',
        userId: target.user_id,
        confirmEmail: typed.trim(),
        reason: reason.trim() || undefined,
        blockIps: alsoIps,
      });
      const ips = r.ips ? ipResultText(r.ips) : '';
      toast.success(`${target.email} and everything they stored has been deleted.${ips}`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, 'Couldn\'t delete the account'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(target)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete {target?.email}
          </DialogTitle>
          <DialogDescription>
            This can't be undone. It deletes their login, résumés, cover letters, job
            tracker, interview history, AI usage history and every other record we hold,
            the same as when someone deletes their own account. The change log keeps a
            note that you did it, with their email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Type their email to confirm</Label>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={target?.email ?? ''} autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label>Reason (optional, kept in the log)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. spam account" />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={alsoIps} onCheckedChange={(v) => setAlsoIps(v === true)} className="mt-0.5" />
            <span>
              Also block the IP addresses only they have used, so they can't just sign up again
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={busy || !matches}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Admin access ───────────────────────────────────────────────────────────

export function AdminRoleDialog({
  target,
  makeAdmin,
  onClose,
  onDone,
}: BaseProps & { makeAdmin: boolean }) {
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await setAdmin(target.user_id, makeAdmin);
      toast.success(makeAdmin ? `${target.email} is now an admin.` : `${target.email} is no longer an admin.`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, 'Couldn\'t change admin access'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(target)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{makeAdmin ? 'Make' : 'Remove'} {target?.email} {makeAdmin ? 'an admin' : 'as an admin'}</DialogTitle>
          <DialogDescription>
            {makeAdmin
              ? 'They get the full admin panel: every user\'s data, bans, deletions, IP blocks, plans and prices — including removing other admins. Only do this for someone you trust completely.'
              : 'They lose the admin panel straight away. Their account and data stay as they are.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={makeAdmin ? 'default' : 'destructive'} onClick={submit} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {makeAdmin ? 'Make admin' : 'Remove admin'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Block an IP or range ───────────────────────────────────────────────────

const EXPIRIES = [
  { value: 'never', label: 'Until I remove it' },
  { value: '1', label: '1 day' },
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
];

export function BlockIpDialog({
  open,
  initialNetwork,
  onClose,
  onDone,
}: {
  open: boolean;
  initialNetwork?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const myIp = useMyIp();
  const [network, setNetwork] = useState('');
  const [reason, setReason] = useState('');
  const [expiry, setExpiry] = useState('never');
  const [preview, setPreview] = useState<NetworkAccount[] | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setNetwork(initialNetwork ?? '');
      setReason('');
      setExpiry('never');
    }
  }, [open, initialNetwork]);

  // Who it would catch, looked up as the admin types.
  useEffect(() => {
    if (!open) return;
    const value = network.trim();
    setPreview(null);
    setPreviewError(null);
    if (!value) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      fetchNetworkAccounts(value)
        .then((rows) => !cancelled && setPreview(rows))
        .catch((err) => !cancelled && setPreviewError(errorMessage(err, 'Not a valid address or range')));
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [network, open]);

  const ownNetwork = useMemo(() => Boolean(myIp && network.trim() && ipInNetwork(myIp, network.trim())), [myIp, network]);
  const others = (preview ?? []).filter((a) => !a.is_admin);
  const admins = (preview ?? []).filter((a) => a.is_admin);

  const submit = async () => {
    setBusy(true);
    try {
      const expiresAt = expiry === 'never' ? null : new Date(Date.now() + Number(expiry) * 864e5).toISOString();
      const net = network.trim();
      const r = await blockIp(net, reason.trim() || null, expiresAt);
      if (r.replaced) {
        const was = r.previous_expires_at
          ? `until ${new Date(r.previous_expires_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`
          : 'permanently';
        const why = r.previous_reason ? `, "${r.previous_reason}"` : '';
        toast.success(`${net} was already blocked (${was}${why}). It now has the reason and expiry you just set.`, {
          duration: 10000,
        });
      } else {
        toast.success(`${net} is blocked.`);
      }
      onDone();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, 'Couldn\'t block that'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Block an IP address or range</DialogTitle>
          <DialogDescription>
            Anyone on it is shut out of the site and every AI feature, and signed out if
            they're signed in. Admins are never blocked.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Address or range</Label>
            <Input
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              placeholder="203.0.113.7  or  203.0.113.0/24"
              className="font-mono"
              autoComplete="off"
            />
            {previewError ? (
              <p className="text-xs text-destructive">{previewError}</p>
            ) : preview ? (
              <p className="text-xs text-muted-foreground">
                {others.length === 0
                  ? 'No account has been seen on this yet.'
                  : `${others.length} account${others.length === 1 ? ' has' : 's have'} been seen on this and will be shut out: ${others
                      .slice(0, 5)
                      .map((a) => a.email)
                      .join(', ')}${others.length > 5 ? ` and ${others.length - 5} more` : ''}.`}
                {admins.length > 0 && ` ${admins.length} admin${admins.length === 1 ? '' : 's'} seen here won't be affected.`}
              </p>
            ) : null}
            {ownNetwork && (
              <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                This includes your own current address ({myIp}). You'll stay in as an admin, but
                anyone else on your network will be blocked.
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>For how long</Label>
              <Select value={expiry} onValueChange={setExpiry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRIES.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. sign-up spam" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={busy || !network.trim() || Boolean(previewError)}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Block
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
