import { useState, useEffect } from 'react';
import { Save, MessageSquare, RefreshCw, CheckCircle2, Plus, Sparkles, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import GuidedPromptBuilder from '@/components/admin/GuidedPromptBuilder';

interface ChatPrompt {
  id: string;
  name: string;
  focus_area: string;
  system_prompt: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export default function ChatPrompts() {
  const [prompts, setPrompts] = useState<ChatPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [showGuidedBuilder, setShowGuidedBuilder] = useState(false);
  const [newPrompt, setNewPrompt] = useState({
    name: '',
    focus_area: 'careers',
    system_prompt: '',
    is_default: false,
  });
  const [aiAssistLoading, setAiAssistLoading] = useState<string | null>(null);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_prompts')
        .select('*')
        .order('focus_area')
        .order('is_default', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Error loading prompts:', error);
      toast.error('Failed to load prompts');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (prompt: ChatPrompt) => {
    setEditingId(prompt.id);
    setEditingPrompt(prompt.system_prompt);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingPrompt('');
  };

  const savePrompt = async (id: string) => {
    try {
      const { error } = await supabase
        .from('chat_prompts')
        .update({
          system_prompt: editingPrompt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Prompt updated successfully!');
      setEditingId(null);
      setEditingPrompt('');
      loadPrompts();
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast.error('Failed to save prompt');
    }
  };

  const setDefault = async (id: string, focusArea: string) => {
    try {
      // Unset other defaults for this focus area
      await supabase
        .from('chat_prompts')
        .update({ is_default: false })
        .eq('focus_area', focusArea)
        .neq('id', id);

      // Set new default
      const { error } = await supabase
        .from('chat_prompts')
        .update({ 
          is_default: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Default prompt updated');
      loadPrompts();
    } catch (error) {
      console.error('Error setting default:', error);
      toast.error('Failed to set default prompt');
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('chat_prompts')
        .update({
          is_active: !currentActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Prompt ${!currentActive ? 'activated' : 'deactivated'}`);
      loadPrompts();
    } catch (error) {
      console.error('Error toggling active:', error);
      toast.error('Failed to update prompt status');
    }
  };

  const createPrompt = async () => {
    if (!newPrompt.name.trim()) {
      toast.error('Please enter a prompt name');
      return;
    }

    if (!newPrompt.system_prompt.trim()) {
      toast.error('Please enter a system prompt');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // If setting as default, unset other defaults for this focus area
      if (newPrompt.is_default) {
        await supabase
          .from('chat_prompts')
          .update({ is_default: false })
          .eq('focus_area', newPrompt.focus_area);
      }

      const { error } = await supabase
        .from('chat_prompts')
        .insert({
          name: newPrompt.name.trim(),
          focus_area: newPrompt.focus_area,
          system_prompt: newPrompt.system_prompt.trim(),
          is_default: newPrompt.is_default,
          is_active: true,
          created_by: user?.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('A prompt with this name already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Prompt created successfully!');
      setCreateDialogOpen(false);
      setNewPrompt({
        name: '',
        focus_area: 'careers',
        system_prompt: '',
        is_default: false,
      });
      loadPrompts();
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast.error('Failed to create prompt');
    }
  };


  // Handler for guided prompt builder completion
  const handleGuidedPromptComplete = async (prompt: string, name: string, focusArea: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await (supabase
        .from('chat_prompts') as any)
        .insert({
          name: name.trim(),
          focus_area: focusArea,
          system_prompt: prompt.trim(),
          is_default: false,
          is_active: true,
          created_by: user?.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('A prompt with this name already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Prompt created successfully with AI optimization!');
      setShowGuidedBuilder(false);
      loadPrompts();
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast.error('Failed to create prompt');
    }
  };

  // Group prompts by focus area
  const groupedPrompts = prompts.reduce((acc, prompt) => {
    if (!acc[prompt.focus_area]) {
      acc[prompt.focus_area] = [];
    }
    acc[prompt.focus_area].push(prompt);
    return acc;
  }, {} as Record<string, ChatPrompt[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show guided builder as full-page wizard
  if (showGuidedBuilder) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <GuidedPromptBuilder
          onComplete={handleGuidedPromptComplete}
          onCancel={() => setShowGuidedBuilder(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="w-8 h-8" />
            Chat Prompt Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Customize AI behavior for different focus areas. Changes take effect immediately in chat.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowGuidedBuilder(true)}
            className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Create with AI Wizard
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Quick Create
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Prompt</DialogTitle>
                <DialogDescription>
                  Create a new AI prompt for a specific focus area. The prompt will be active immediately.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt-name">Prompt Name</Label>
                  <Input
                    id="prompt-name"
                    placeholder="e.g., career_coach_v2, policy_analyst"
                    value={newPrompt.name}
                    onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier for this prompt (lowercase, underscores allowed)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="focus-area">Focus Area</Label>
                  <Select
                    value={newPrompt.focus_area}
                    onValueChange={(value) => setNewPrompt({ ...newPrompt, focus_area: value })}
                  >
                    <SelectTrigger id="focus-area">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="careers">Careers</SelectItem>
                      <SelectItem value="policies">Policies</SelectItem>
                      <SelectItem value="funding">Funding</SelectItem>
                      <SelectItem value="entrepreneurship">Entrepreneurship</SelectItem>
                      <SelectItem value="basic">Basic / General</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="system-prompt">System Prompt</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          setAiAssistLoading('generate');
                          const { data, error } = await supabase.functions.invoke('generate-prompt', {
                            body: {
                              action: 'generate',
                              focus_area: newPrompt.focus_area,
                              description: '',
                            },
                          });

                          if (error) throw error;
                          if (data.error) {
                            toast.error(data.error);
                            return;
                          }

                          setNewPrompt(prev => ({ ...prev, system_prompt: data.prompt }));
                          toast.success('Prompt generated! Review and customize as needed.');
                        } catch (error) {
                          console.error('Error generating prompt:', error);
                          toast.error('Failed to generate prompt');
                        } finally {
                          setAiAssistLoading(null);
                        }
                      }}
                      disabled={aiAssistLoading !== null}
                    >
                      {aiAssistLoading === 'generate' ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 mr-1" />
                          Generate with AI
                        </>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    id="system-prompt"
                    placeholder="Enter the system prompt for the AI..."
                    value={newPrompt.system_prompt}
                    onChange={(e) => setNewPrompt({ ...newPrompt, system_prompt: e.target.value })}
                    rows={15}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    This prompt defines how the AI behaves. Include rules, tone, and citation requirements.
                    Click "Generate with AI" to create a prompt automatically.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-default"
                    checked={newPrompt.is_default}
                    onCheckedChange={(checked) => 
                      setNewPrompt({ ...newPrompt, is_default: checked === true })
                    }
                  />
                  <Label htmlFor="is-default" className="cursor-pointer">
                    Set as default for this focus area
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createPrompt} disabled={!newPrompt.name.trim() || !newPrompt.system_prompt.trim()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Prompt
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            onClick={loadPrompts}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {Object.keys(groupedPrompts).length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">No prompts found. Create one in the database.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPrompts).map(([focusArea, areaPrompts]) => (
            <div key={focusArea} className="space-y-4">
              <h2 className="text-xl font-semibold capitalize">{focusArea} Prompts</h2>
              <div className="grid gap-4">
                {areaPrompts.map((prompt) => (
                  <Card key={prompt.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{prompt.name}</CardTitle>
                          {prompt.is_default && (
                            <Badge variant="default" className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Default
                            </Badge>
                          )}
                          {!prompt.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(prompt.id, prompt.is_active)}
                          >
                            {prompt.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          {!prompt.is_default && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDefault(prompt.id, prompt.focus_area)}
                            >
                              Set as Default
                            </Button>
                          )}
                        </div>
                      </div>
                      <CardDescription>
                        Focus Area: {prompt.focus_area} • 
                        Last updated: {new Date(prompt.updated_at).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={editingId === prompt.id ? editingPrompt : prompt.system_prompt}
                        onChange={(e) => setEditingPrompt(e.target.value)}
                        onFocus={() => {
                          if (editingId !== prompt.id) {
                            startEdit(prompt);
                          }
                        }}
                        rows={15}
                        className="font-mono text-sm"
                        disabled={editingId !== prompt.id}
                        placeholder="Enter the system prompt for the AI..."
                      />
                      <div className="flex gap-2 mt-4">
                        {editingId === prompt.id ? (
                          <>
                            <Button
                              onClick={() => savePrompt(prompt.id)}
                              disabled={!editingPrompt.trim()}
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Save Changes
                            </Button>
                            <Button
                              variant="outline"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => startEdit(prompt)}
                            disabled={!prompt.is_active}
                          >
                            Edit Prompt
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

