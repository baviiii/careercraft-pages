import { Outlet, Navigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function AdminLayout() {
  const { user, isAdmin, isWhitelistedAdmin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="ds-shell min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin || !isWhitelistedAdmin) {
    return (
      <div className="ds-shell min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            {!isAdmin 
              ? "You don't have admin privileges. Contact an administrator to request access."
              : "Your email is not on the admin whitelist. Contact a super admin to be added."}
          </p>
          <Button asChild>
            <Link to="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="ds-shell min-h-screen flex w-full">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border/50 flex items-center px-4 sticky top-0 bg-[color:var(--ds-bg)]/95 backdrop-blur z-10">
            <SidebarTrigger className="mr-4" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Super Admin</span>
              <span className="text-xs text-muted-foreground">|</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </div>
          </header>
          
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
