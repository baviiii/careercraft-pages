import { Card } from "@/components/ui/card";

interface TemplatePreviewProps {
  isPreview?: boolean;
}

export const ModernTemplate2 = ({ isPreview = true }: TemplatePreviewProps) => {
  return (
    <Card className={`bg-gradient-to-br from-slate-50 to-slate-100 text-black ${isPreview ? 'scale-[0.4] origin-top-left w-[210mm] h-[297mm]' : 'w-full'} p-8 shadow-none border-2 border-border`}>
      <div className="space-y-6">
        {/* Centered Header */}
        <div className="text-center pb-4 border-b-2 border-slate-800">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">JOHN DOE</h1>
          <p className="text-sm text-slate-600">Software Engineer • Tech Enthusiast • Problem Solver</p>
          <p className="text-xs text-slate-500 mt-2">john@example.com | (555) 123-4567 | New York, NY</p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Sidebar */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-2 pb-1 border-b border-slate-800">Skills</h2>
              <div className="space-y-1 text-xs text-slate-700">
                <div>• JavaScript</div>
                <div>• React</div>
                <div>• Node.js</div>
                <div>• TypeScript</div>
                <div>• Python</div>
              </div>
            </div>
            
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-2 pb-1 border-b border-slate-800">Education</h2>
              <div className="text-xs text-slate-700">
                <p className="font-semibold">BS Computer Science</p>
                <p className="text-slate-600">University Name</p>
                <p className="text-slate-500">2019</p>
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="col-span-2 space-y-4">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3 pb-1 border-b border-slate-800">Experience</h2>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-sm text-slate-900">Senior Software Engineer</h3>
                    <span className="text-xs text-slate-500">2021 - Present</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-1">Tech Company Inc. • New York, NY</p>
                  <ul className="text-xs text-slate-700 space-y-0.5 list-disc list-inside">
                    <li>Architected microservices infrastructure</li>
                    <li>Led team of 5 developers</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
