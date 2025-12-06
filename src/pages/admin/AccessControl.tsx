import { useState, useEffect } from 'react';
import { Plus, Trash2, Shield, Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface WhitelistEntry {
  id: string;
  email: string;
  added_by: string | null;
  created_at: string;
}

export default function AccessControl() {
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const fetchWhitelist = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_whitelist')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWhitelist(data || []);
    } catch (error) {
      console.error('Error fetching whitelist:', error);
      toast.error('Failed to load admin whitelist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWhitelist();
  }, []);

  const handleAddEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('admin_whitelist')
        .insert({ 
          email: newEmail.toLowerCase().trim(),
          added_by: user?.id
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Email already in whitelist');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Email added to admin whitelist');
      setNewEmail('');
      setDialogOpen(false);
      fetchWhitelist();
    } catch (error) {
      console.error('Error adding email:', error);
      toast.error('Failed to add email');
    }
  };

  const handleRemoveEmail = async (id: string) => {
    try {
      const { error } = await supabase
        .from('admin_whitelist')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Email removed from whitelist');
      fetchWhitelist();
    } catch (error) {
      console.error('Error removing email:', error);
      toast.error('Failed to remove email');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Access Control</h1>
          <p className="text-muted-foreground">Manage admin access and permissions</p>
        </div>
        <Button variant="outline" onClick={fetchWhitelist} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Admin Access Requirements</h3>
              <p className="text-sm text-muted-foreground mt-1">
                To access the admin dashboard, users must have:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  The <Badge variant="outline" className="mx-1">admin</Badge> role assigned
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Their email on the approved whitelist below
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Admin Email Whitelist</CardTitle>
            <CardDescription>
              Only emails on this list can access the admin panel (with admin role)
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Email
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Admin Email</DialogTitle>
                <DialogDescription>
                  Add an email address to the admin whitelist. The user must also have the admin role.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddEmail}>
                  <Mail className="w-4 h-4 mr-2" />
                  Add to Whitelist
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Email</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {whitelist.map((entry) => (
                <TableRow key={entry.id} className="border-border/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{entry.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveEmail(entry.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {whitelist.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    {loading ? 'Loading...' : 'No emails in whitelist. Add one to enable admin access.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
