// The "…" menu on each row of the Users table. Actions an admin can't take —
// anything on their own account, or on another admin beyond removing their
// admin access — aren't offered (and the server refuses them anyway).

import { Ban, Eye, Loader2, LogOut, Mail, MoreHorizontal, ShieldOff, ShieldPlus, Trash2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { isAdminLike, isBanned, type AdminUserRow } from '@/lib/adminUsers';

export interface RowActionHandlers {
  view: () => void;
  ban: () => void;
  unban: () => void;
  signOut: () => void;
  blockIps: () => void;
  toggleAdmin: () => void;
  remove: () => void;
}

export function UserRowActions({
  user,
  isSelf,
  busy,
  on,
}: {
  user: AdminUserRow;
  isSelf: boolean;
  busy: boolean;
  on: RowActionHandlers;
}) {
  const adminLike = isAdminLike(user);
  const actionable = !isSelf && !adminLike;
  const banned = isBanned(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={busy} aria-label={`Actions for ${user.email}`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={on.view}>
          <Eye className="mr-2 h-4 w-4" /> View account
        </DropdownMenuItem>
        {user.email && (
          <DropdownMenuItem onClick={() => (window.location.href = `mailto:${encodeURIComponent(user.email!)}`)}>
            <Mail className="mr-2 h-4 w-4" /> Email them
          </DropdownMenuItem>
        )}
        {actionable && (
          <>
            <DropdownMenuSeparator />
            {banned ? (
              <DropdownMenuItem onClick={on.unban}>
                <UserCheck className="mr-2 h-4 w-4" /> Unban
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={on.ban} className="text-orange-600">
                <Ban className="mr-2 h-4 w-4" /> Ban…
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={on.signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out everywhere
            </DropdownMenuItem>
            {user.ip_count > 0 && (
              <DropdownMenuItem onClick={on.blockIps}>
                <ShieldOff className="mr-2 h-4 w-4" /> Block their IPs
              </DropdownMenuItem>
            )}
          </>
        )}
        {!isSelf && !banned && (
          <DropdownMenuItem onClick={on.toggleAdmin}>
            <ShieldPlus className="mr-2 h-4 w-4" /> {adminLike ? 'Remove admin…' : 'Make admin…'}
          </DropdownMenuItem>
        )}
        {actionable && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={on.remove} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete account…
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
