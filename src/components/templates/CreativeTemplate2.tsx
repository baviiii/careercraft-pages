import { Card } from "@/components/ui/card";

interface TemplatePreviewProps {
  isPreview?: boolean;
}

export const CreativeTemplate2 = ({ isPreview = true }: TemplatePreviewProps) => {
  return (
    <Card className={`bg-black text-white ${isPreview ? 'scale-[0.4] origin-top-left w-[210mm] h-[297mm]' : 'w-full'} p-8 shadow-none border-2 border-orange-500`}>
      <div className="space-y-6">
        {/* Bold Header with Geometric Elements */}
        <div className="relative pb-6 border-b-4 border-orange-500">
          <div className="absolute -top-4 -left-4 w-16 h-16 bg-orange-500 opacity-20 rotate-45"></div>
          <h1 className="text-5xl font-black text-white mb-1 tracking-tight">JOHN DOE</h1>
          <p className="text-orange-500 font-bold text-lg tracking-wide">DIGITAL CREATIVE</p>
          <p className="text-xs text-gray-400 mt-2">john@example.com • (555) 123-4567 • New York, NY</p>
        </div>

        {/* Unique Diagonal Layout */}
        <div className="space-y-5">
          {/* About */}
          <div className="bg-gradient-to-r from-orange-500/20 to-transparent p-4 border-l-4 border-orange-500">
            <h2 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-2">About</h2>
            <p className="text-xs text-gray-300 leading-relaxed">
              Innovative technologist passionate about creating bold digital experiences. 
              Combining technical expertise with creative vision to build impactful solutions.
            </p>
          </div>

          {/* Experience with Unique Style */}
          <div>
            <h2 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-4 flex items-center">
              <span className="flex-1 h-px bg-orange-500 mr-3"></span>
              Experience
            </h2>
            <div className="space-y-4">
              <div className="relative pl-8 pb-4 border-l-2 border-gray-700">
                <div className="absolute -left-2 top-0 w-4 h-4 bg-orange-500 rotate-45"></div>
                <div className="bg-gray-900/50 p-3 rounded border border-gray-800">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-black text-sm text-white">Senior Software Engineer</h3>
                      <p className="text-xs text-orange-500 font-bold">Tech Company Inc.</p>
                    </div>
                    <span className="text-xs font-bold text-gray-400">2021 - Present</span>
                  </div>
                  <ul className="text-xs text-gray-300 space-y-1">
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2">▸</span>
                      <span>Architected cutting-edge microservices platform</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2">▸</span>
                      <span>Pioneered performance optimization strategies</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Skills Grid */}
          <div>
            <h2 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-3 flex items-center">
              <span className="flex-1 h-px bg-orange-500 mr-3"></span>
              Skills
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-900 border border-orange-500/30 p-2 text-center hover:border-orange-500 transition-colors">
                <span className="text-xs font-bold text-white">JavaScript</span>
              </div>
              <div className="bg-gray-900 border border-orange-500/30 p-2 text-center hover:border-orange-500 transition-colors">
                <span className="text-xs font-bold text-white">React</span>
              </div>
              <div className="bg-gray-900 border border-orange-500/30 p-2 text-center hover:border-orange-500 transition-colors">
                <span className="text-xs font-bold text-white">Node.js</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
