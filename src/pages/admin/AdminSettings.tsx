import { useState } from 'react';
import { Save, Bell, Shield, Database, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    emailAlerts: true,
    slackIntegration: false,
    autoSuspendFailedLogins: true,
    failedLoginThreshold: 5,
    sessionTimeout: 30,
    enforeMFA: false,
    dataRetentionDays: 90,
    theme: 'system',
  });

  const handleSave = () => {
    // In a real app, save to database
    toast.success('Settings saved successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Settings</h1>
          <p className="text-muted-foreground">Configure dashboard and security settings</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Notifications */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Notifications</CardTitle>
            </div>
            <CardDescription>Configure how you receive alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailAlerts">Email Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Receive security alerts via email
                </p>
              </div>
              <Switch
                id="emailAlerts"
                checked={settings.emailAlerts}
                onCheckedChange={(checked) => setSettings({ ...settings, emailAlerts: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="slackIntegration">Slack Integration</Label>
                <p className="text-sm text-muted-foreground">
                  Send alerts to a Slack channel
                </p>
              </div>
              <Switch
                id="slackIntegration"
                checked={settings.slackIntegration}
                onCheckedChange={(checked) => setSettings({ ...settings, slackIntegration: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Security</CardTitle>
            </div>
            <CardDescription>Security and authentication settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoSuspend">Auto-suspend on Failed Logins</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically suspend accounts after repeated failed logins
                </p>
              </div>
              <Switch
                id="autoSuspend"
                checked={settings.autoSuspendFailedLogins}
                onCheckedChange={(checked) => setSettings({ ...settings, autoSuspendFailedLogins: checked })}
              />
            </div>
            
            {settings.autoSuspendFailedLogins && (
              <div className="flex items-center gap-4 pl-4 border-l-2 border-primary/20">
                <Label htmlFor="threshold">Failed login threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={settings.failedLoginThreshold}
                  onChange={(e) => setSettings({ ...settings, failedLoginThreshold: parseInt(e.target.value) })}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">attempts</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="mfa">Enforce MFA for Admins</Label>
                <p className="text-sm text-muted-foreground">
                  Require multi-factor authentication for all admin users
                </p>
              </div>
              <Switch
                id="mfa"
                checked={settings.enforeMFA}
                onCheckedChange={(checked) => setSettings({ ...settings, enforeMFA: checked })}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">minutes of inactivity</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Data Management</CardTitle>
            </div>
            <CardDescription>Configure data retention and storage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="retention">Log Retention Period</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="retention"
                  type="number"
                  value={settings.dataRetentionDays}
                  onChange={(e) => setSettings({ ...settings, dataRetentionDays: parseInt(e.target.value) })}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Activity logs older than this will be automatically deleted
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Appearance</CardTitle>
            </div>
            <CardDescription>Customize dashboard appearance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select 
                value={settings.theme} 
                onValueChange={(value) => setSettings({ ...settings, theme: value })}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
