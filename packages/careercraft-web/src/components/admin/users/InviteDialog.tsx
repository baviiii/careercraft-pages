// Sends a real Supabase invite email. The old "Invite" showed a success
// message and sent nothing.

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { accountAction, errorMessage } from '@/lib/adminUsers';

export function InviteDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = /^\S+@\S+\.\S+$/.test(email.trim());

  const send = async () => {
    setBusy(true);
    try {
      await accountAction({ action: 'invite', email: email.trim() });
      toast.success(`Invite sent to ${email.trim()}.`);
      setEmail('');
      onDone();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, 'Couldn\'t send the invite'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Invite someone</DialogTitle>
          <DialogDescription>
            They get an email with a link to set up their account. They start on the free plan, like anyone else.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={send} disabled={busy || !valid}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
