/**
 * Guided Prompt Builder - Multi-Step Wizard for RAG-Optimized Prompts
 * 
 * This component guides users step-by-step to collect their ideas and then
 * uses AI to transform them into powerful prompts optimized for RAG systems.
 * 
 * The wizard is MANDATORY - users must complete all steps and use AI generation
 * to ensure prompts leverage the full power of the RAG system.
 */

import { useState } from 'react';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Loader2,
  Target,
  Users,
  MessageCircle,
  FileText,
  Lightbulb,
  Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WizardData {
  // Step 1: Basic Info
  name: string;
  focusArea: string;
  customFocusArea: string;
  
  // Step 2: Target Audience
  targetAudience: string;
  audienceExpertise: 'beginner' | 'intermediate' | 'expert' | 'mixed';
  audienceGoals: string[];
  customGoals: string;
  
  // Step 3: Conversation Style
  tone: string[];
  responseLength: 'concise' | 'detailed' | 'adaptive';
  personality: string;
  
  // Step 4: Content Requirements
  topicFocus: string;
  mustInclude: string[];
  mustAvoid: string[];
  customMustInclude: string;
  customMustAvoid: string;
  
  sourcePreferences: string[];
  
  // Step 5: Special Instructions
  // (Citation style and accuracy are not persona settings: the Horus agent
  // applies its own grounding and citation rules to every answer.)
  specialInstructions: string;
  exampleQuestions: string;
  desiredOutcomes: string;
}

interface GuidedPromptBuilderProps {
  onComplete: (prompt: string, name: string, focusArea: string) => void;
  onCancel: () => void;
  initialFocusArea?: string;
}

const STEPS = [
  { id: 1, title: 'Basic Info', icon: Target, description: 'Name & focus area' },
  { id: 2, title: 'Audience', icon: Users, description: 'Who will use this?' },
  { id: 3, title: 'Style', icon: MessageCircle, description: 'Conversation tone' },
  { id: 4, title: 'Content', icon: FileText, description: 'What to cover' },
  { id: 5, title: 'Special', icon: Lightbulb, description: 'Extra instructions' },
];

const PREDEFINED_FOCUS_AREAS = [
  { value: 'careers', label: 'Careers & Jobs', description: 'Career guidance, job advice, training' },
  { value: 'policies', label: 'Policies', description: 'Policy analysis, regulations' },
  { value: 'funding', label: 'Funding', description: 'Budget analysis, financial info' },
  { value: 'entrepreneurship', label: 'Entrepreneurship', description: 'Business startup, grants, small business' },
  { value: 'basic', label: 'Basic / General', description: 'Overall SA experience & information' },
  { value: 'general', label: 'General', description: 'Multi-domain assistance' },
  { value: 'custom', label: 'Custom', description: 'Define your own focus' },
];

const AUDIENCE_GOALS = [
  'Get career advice',
  'Find job opportunities',
  'Understand policies',
  'Research funding options',
  'Learn new skills',
  'Make informed decisions',
  'Get quick answers',
  'Deep research',
];

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly & Warm' },
  { value: 'encouraging', label: 'Encouraging' },
  { value: 'direct', label: 'Direct & Concise' },
  { value: 'empathetic', label: 'Empathetic' },
  { value: 'authoritative', label: 'Authoritative' },
];

const SOURCE_PREFERENCES = [
  'Government documents',
  'Job listings',
  'Budget papers',
  'Training programs',
  'Policy documents',
  'Statistical data',
  'News & updates',
];

const initialData: WizardData = {
  name: '',
  focusArea: 'careers',
  customFocusArea: '',
  targetAudience: '',
  audienceExpertise: 'mixed',
  audienceGoals: [],
  customGoals: '',
  tone: ['professional', 'friendly'],
  responseLength: 'adaptive',
  personality: '',
  topicFocus: '',
  mustInclude: [],
  mustAvoid: [],
  customMustInclude: '',
  customMustAvoid: '',
  sourcePreferences: [],
  specialInstructions: '',
  exampleQuestions: '',
  desiredOutcomes: '',
};

export default function GuidedPromptBuilder({ 
  onComplete, 
  onCancel,
  initialFocusArea = 'careers' 
}: GuidedPromptBuilderProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    ...initialData,
    focusArea: initialFocusArea,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const updateData = (updates: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const toggleArrayItem = (field: keyof WizardData, item: string) => {
    const current = data[field] as string[];
    if (current.includes(item)) {
      updateData({ [field]: current.filter(i => i !== item) });
    } else {
      updateData({ [field]: [...current, item] });
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return data.name.trim().length > 0 && 
               (data.focusArea !== 'custom' || data.customFocusArea.trim().length > 0);
      case 2:
        return data.targetAudience.trim().length > 0;
      case 3:
        return data.tone.length > 0;
      case 4:
        return data.topicFocus.trim().length > 0;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const generatePromptWithAI = async () => {
    setIsGenerating(true);
    
    try {
      const { data: responseData, error } = await supabase.functions.invoke('generate-prompt', {
        body: {
          action: 'generate_guided',
          wizard_data: {
            ...data,
            focusArea: data.focusArea === 'custom' ? data.customFocusArea : data.focusArea,
          },
        },
      });

      if (error) throw error;

      if (responseData.error) {
        toast.error(responseData.error);
        return;
      }

      setGeneratedPrompt(responseData.prompt);
      setShowPreview(true);
      toast.success('Prompt generated! Review and finalize below.');
      
    } catch (error) {
      console.error('Error generating prompt:', error);
      toast.error('Failed to generate prompt. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComplete = () => {
    if (!generatedPrompt) return;
    
    const finalFocusArea = data.focusArea === 'custom' ? data.customFocusArea : data.focusArea;
    onComplete(generatedPrompt, data.name, finalFocusArea);
  };

  const progress = (currentStep / STEPS.length) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="prompt-name" className="text-base font-medium">
                Prompt Name *
              </Label>
              <Input
                id="prompt-name"
                placeholder="e.g., healthcare_career_advisor, policy_expert_v2"
                value={data.name}
                onChange={(e) => updateData({ name: e.target.value })}
                className="text-base"
              />
              <p className="text-sm text-muted-foreground">
                A unique identifier for this prompt (lowercase, underscores allowed)
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Focus Area *</Label>
              <div className="grid gap-3">
                {PREDEFINED_FOCUS_AREAS.map((area) => (
                  <div
                    key={area.value}
                    onClick={() => updateData({ focusArea: area.value })}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                      data.focusArea === area.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                      data.focusArea === area.value ? "border-primary" : "border-muted-foreground"
                    )}>
                      {data.focusArea === area.value && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{area.label}</div>
                      <div className="text-sm text-muted-foreground">{area.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {data.focusArea === 'custom' && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <Label htmlFor="custom-focus" className="text-base font-medium">
                  Custom Focus Area *
                </Label>
                <Input
                  id="custom-focus"
                  placeholder="e.g., education, healthcare, small business"
                  value={data.customFocusArea}
                  onChange={(e) => updateData({ customFocusArea: e.target.value })}
                  className="text-base"
                />
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="target-audience" className="text-base font-medium">
                Who is this AI assistant for? *
              </Label>
              <Textarea
                id="target-audience"
                placeholder="e.g., Job seekers in South Australia looking for career change opportunities, particularly those in their 30s-40s transitioning from traditional industries..."
                value={data.targetAudience}
                onChange={(e) => updateData({ targetAudience: e.target.value })}
                rows={3}
                className="text-base"
              />
              <p className="text-sm text-muted-foreground">
                Be specific! The more detail you provide, the better the AI can tailor responses.
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Audience Expertise Level</Label>
              <RadioGroup
                value={data.audienceExpertise}
                onValueChange={(v) => updateData({ audienceExpertise: v as any })}
                className="grid grid-cols-2 gap-3"
              >
                {[
                  { value: 'beginner', label: 'Beginner', desc: 'New to the topic' },
                  { value: 'intermediate', label: 'Intermediate', desc: 'Some knowledge' },
                  { value: 'expert', label: 'Expert', desc: 'Deep expertise' },
                  { value: 'mixed', label: 'Mixed', desc: 'Varies by user' },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value} className="cursor-pointer">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-muted-foreground text-sm ml-1">- {option.desc}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">What do users want to achieve?</Label>
              <div className="grid grid-cols-2 gap-2">
                {AUDIENCE_GOALS.map((goal) => (
                  <div
                    key={goal}
                    onClick={() => toggleArrayItem('audienceGoals', goal)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all text-sm",
                      data.audienceGoals.includes(goal)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Checkbox checked={data.audienceGoals.includes(goal)} />
                    {goal}
                  </div>
                ))}
              </div>
              <Textarea
                placeholder="Any other specific goals? (optional)"
                value={data.customGoals}
                onChange={(e) => updateData({ customGoals: e.target.value })}
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base font-medium">Conversation Tone (select all that apply) *</Label>
              <div className="grid grid-cols-2 gap-2">
                {TONE_OPTIONS.map((tone) => (
                  <div
                    key={tone.value}
                    onClick={() => toggleArrayItem('tone', tone.value)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all",
                      data.tone.includes(tone.value)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Checkbox checked={data.tone.includes(tone.value)} />
                    {tone.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Response Length</Label>
              <RadioGroup
                value={data.responseLength}
                onValueChange={(v) => updateData({ responseLength: v as any })}
                className="space-y-2"
              >
                {[
                  { value: 'concise', label: 'Concise', desc: 'Brief, to-the-point answers' },
                  { value: 'detailed', label: 'Detailed', desc: 'Comprehensive explanations' },
                  { value: 'adaptive', label: 'Adaptive', desc: 'Adjust based on question complexity' },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`length-${option.value}`} />
                    <Label htmlFor={`length-${option.value}`} className="cursor-pointer flex-1">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-muted-foreground text-sm ml-2">- {option.desc}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="personality" className="text-base font-medium">
                Personality Traits (optional)
              </Label>
              <Textarea
                id="personality"
                placeholder="e.g., Think of it as a supportive mentor who celebrates small wins, asks clarifying questions, and provides encouragement during setbacks..."
                value={data.personality}
                onChange={(e) => updateData({ personality: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="topic-focus" className="text-base font-medium">
                What topics should the AI focus on? *
              </Label>
              <Textarea
                id="topic-focus"
                placeholder="e.g., Healthcare careers in SA, nursing pathways, aged care opportunities, medical research positions, healthcare funding and scholarships..."
                value={data.topicFocus}
                onChange={(e) => updateData({ topicFocus: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Preferred Source Types</Label>
              <div className="grid grid-cols-2 gap-2">
                {SOURCE_PREFERENCES.map((source) => (
                  <div
                    key={source}
                    onClick={() => toggleArrayItem('sourcePreferences', source)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all text-sm",
                      data.sourcePreferences.includes(source)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Checkbox checked={data.sourcePreferences.includes(source)} />
                    {source}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-medium">Must Include</Label>
                <Textarea
                  placeholder="Things the AI should always mention or cover..."
                  value={data.customMustInclude}
                  onChange={(e) => updateData({ customMustInclude: e.target.value })}
                  rows={3}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium">Must Avoid</Label>
                <Textarea
                  placeholder="Topics or behaviors to avoid..."
                  value={data.customMustAvoid}
                  onChange={(e) => updateData({ customMustAvoid: e.target.value })}
                  rows={3}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="special-instructions" className="text-base font-medium">
                Special Instructions
              </Label>
              <Textarea
                id="special-instructions"
                placeholder="Any specific behaviors, rules, or guidelines not covered above? e.g., 'Always suggest next steps', 'Never give legal advice', 'Recommend contacting professionals for complex issues'..."
                value={data.specialInstructions}
                onChange={(e) => updateData({ specialInstructions: e.target.value })}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="example-questions" className="text-base font-medium">
                Example Questions Users Might Ask
              </Label>
              <Textarea
                id="example-questions"
                placeholder="Help us understand your users better. What questions will they ask? e.g., 'How do I become a nurse in SA?', 'What funding is available for training?', 'What are the growth sectors?'..."
                value={data.exampleQuestions}
                onChange={(e) => updateData({ exampleQuestions: e.target.value })}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desired-outcomes" className="text-base font-medium">
                Desired Outcomes
              </Label>
              <Textarea
                id="desired-outcomes"
                placeholder="What should users feel/know/do after interacting with this AI? e.g., 'Feel confident about their career options', 'Have a clear action plan', 'Understand available resources'..."
                value={data.desiredOutcomes}
                onChange={(e) => updateData({ desiredOutcomes: e.target.value })}
                rows={4}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (showPreview && generatedPrompt) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Your AI-Powered Prompt is Ready!</h2>
            <p className="text-muted-foreground">Review the generated prompt below. You can still edit it if needed.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {data.name}
                  <Badge variant="secondary">
                    {data.focusArea === 'custom' ? data.customFocusArea : data.focusArea}
                  </Badge>
                </CardTitle>
                <CardDescription>Generated with AI optimization for RAG</CardDescription>
              </div>
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={generatedPrompt}
              onChange={(e) => setGeneratedPrompt(e.target.value)}
              rows={20}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setShowPreview(false)}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Wizard
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={generatePromptWithAI} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              Regenerate
            </Button>
            <Button onClick={handleComplete}>
              <Check className="w-4 h-4 mr-2" />
              Create Prompt
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Guided Prompt Builder
          </h2>
          <Badge variant="outline">Step {currentStep} of {STEPS.length}</Badge>
        </div>
        <Progress value={progress} className="h-2" />
        
        {/* Step indicators */}
        <div className="flex justify-between">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            
            return (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center gap-1 flex-1",
                  isActive ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2",
                  isActive ? "border-primary bg-primary/10" : 
                  isCompleted ? "border-green-600 bg-green-100 dark:bg-green-900/30" : 
                  "border-muted-foreground/30"
                )}>
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span className="text-xs font-medium hidden sm:block">{step.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Step */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const Icon = STEPS[currentStep - 1].icon;
              return <Icon className="w-5 h-5" />;
            })()}
            {STEPS[currentStep - 1].title}
          </CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => currentStep === 1 ? onCancel() : setCurrentStep(s => s - 1)}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </Button>

        {currentStep < STEPS.length ? (
          <Button onClick={() => setCurrentStep(s => s + 1)} disabled={!canProceed()}>
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={generatePromptWithAI} 
            disabled={!canProceed() || isGenerating}
            className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate with AI
              </>
            )}
          </Button>
        )}
      </div>

      {/* Info banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4">
          <p className="text-sm flex items-start gap-2">
            <Sparkles className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
            <span>
              <strong>AI-Powered Generation Required:</strong> After completing all steps, 
              our AI turns your inputs into a persona — the coach's audience, voice and answer shape. 
              Sourcing and citations are handled by the coach itself, for every persona.
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
