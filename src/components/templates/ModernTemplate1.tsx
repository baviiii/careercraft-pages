import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface TemplatePreviewProps {
  isPreview?: boolean;
}

export const ModernTemplate1 = ({ isPreview = true }: TemplatePreviewProps) => {
  return (
    <Card className={`bg-white text-black ${isPreview ? 'scale-[0.4] origin-top-left w-[210mm] h-[297mm]' : 'w-full'} p-8 shadow-none border-2 border-border`}>
      <div className="space-y-6">
        {/* Header with accent bar */}
        <div className="border-l-4 border-blue-600 pl-4">
          <h1 className="text-3xl font-bold text-gray-900">John Doe</h1>
          <p className="text-sm text-gray-600 mt-1">john@example.com | (555) 123-4567 | New York, NY</p>
        </div>

        {/* Summary */}
        <div>
          <h2 className="text-lg font-bold text-blue-600 mb-2">PROFESSIONAL SUMMARY</h2>
          <Separator className="mb-3 bg-blue-600" />
          <p className="text-sm text-gray-700 leading-relaxed">
            Results-driven professional with 5+ years of experience in technology and innovation...
          </p>
        </div>

        {/* Experience */}
        <div>
          <h2 className="text-lg font-bold text-blue-600 mb-2">EXPERIENCE</h2>
          <Separator className="mb-3 bg-blue-600" />
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900">Senior Software Engineer</h3>
                  <p className="text-sm text-gray-600">Tech Company Inc.</p>
                </div>
                <span className="text-xs text-gray-500">2021 - Present</span>
              </div>
              <ul className="mt-2 text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>Led development of microservices architecture</li>
                <li>Improved system performance by 40%</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div>
          <h2 className="text-lg font-bold text-blue-600 mb-2">SKILLS</h2>
          <Separator className="mb-3 bg-blue-600" />
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">JavaScript</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">React</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">Node.js</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
