import { Card } from "@/components/ui/card";

interface TemplatePreviewProps {
  isPreview?: boolean;
}

export const ProfessionalTemplate = ({ isPreview = true }: TemplatePreviewProps) => {
  return (
    <Card className={`bg-white text-black ${isPreview ? 'scale-[0.4] origin-top-left w-[210mm] h-[297mm]' : 'w-full'} p-8 shadow-none border-2 border-border`}>
      <div className="space-y-5">
        {/* Classic Header */}
        <div className="text-center pb-3 border-b-2 border-black">
          <h1 className="text-3xl font-serif font-bold text-black mb-1">JOHN DOE</h1>
          <p className="text-xs text-gray-700">john@example.com • (555) 123-4567 • New York, NY</p>
        </div>

        {/* Summary */}
        <div>
          <h2 className="text-sm font-bold text-black uppercase tracking-wider mb-2 border-b border-gray-400 pb-1">Professional Summary</h2>
          <p className="text-xs text-gray-800 leading-relaxed">
            Accomplished professional with proven expertise in software development and project management. 
            Demonstrated success in leading cross-functional teams and delivering high-impact solutions.
          </p>
        </div>

        {/* Experience */}
        <div>
          <h2 className="text-sm font-bold text-black uppercase tracking-wider mb-2 border-b border-gray-400 pb-1">Professional Experience</h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="font-bold text-sm text-black">Senior Software Engineer</h3>
                <span className="text-xs text-gray-600">2021 - Present</span>
              </div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Tech Company Inc., New York, NY</p>
              <ul className="text-xs text-gray-800 space-y-0.5 ml-4" style={{ listStyleType: 'disc' }}>
                <li>Spearheaded development of enterprise-scale microservices architecture serving 1M+ users</li>
                <li>Directed cross-functional team of 5 engineers, improving delivery velocity by 30%</li>
                <li>Implemented performance optimizations resulting in 40% reduction in application load time</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Education */}
        <div>
          <h2 className="text-sm font-bold text-black uppercase tracking-wider mb-2 border-b border-gray-400 pb-1">Education</h2>
          <div>
            <div className="flex justify-between items-baseline">
              <h3 className="font-bold text-sm text-black">Bachelor of Science in Computer Science</h3>
              <span className="text-xs text-gray-600">2019</span>
            </div>
            <p className="text-xs text-gray-700">University Name, Boston, MA • GPA: 3.8/4.0</p>
          </div>
        </div>

        {/* Skills */}
        <div>
          <h2 className="text-sm font-bold text-black uppercase tracking-wider mb-2 border-b border-gray-400 pb-1">Technical Skills</h2>
          <p className="text-xs text-gray-800">
            <span className="font-semibold">Languages:</span> JavaScript, TypeScript, Python, Java<br/>
            <span className="font-semibold">Frameworks:</span> React, Node.js, Express, Next.js<br/>
            <span className="font-semibold">Tools:</span> Git, Docker, AWS, Jenkins, MongoDB
          </p>
        </div>
      </div>
    </Card>
  );
};
