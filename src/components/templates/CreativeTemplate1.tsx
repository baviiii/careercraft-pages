import { Card } from "@/components/ui/card";

interface TemplatePreviewProps {
  isPreview?: boolean;
}

export const CreativeTemplate1 = ({ isPreview = true }: TemplatePreviewProps) => {
  return (
    <Card className={`bg-gradient-to-br from-purple-50 via-white to-pink-50 text-black ${isPreview ? 'scale-[0.4] origin-top-left w-[210mm] h-[297mm]' : 'w-full'} p-8 shadow-none border-2 border-border`}>
      <div className="space-y-6">
        {/* Bold Asymmetric Header */}
        <div className="relative">
          <div className="absolute -left-8 top-0 w-2 h-24 bg-gradient-to-b from-purple-600 to-pink-600"></div>
          <div className="pl-4">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
              JOHN DOE
            </h1>
            <p className="text-sm font-bold text-purple-800">Creative Technologist</p>
            <p className="text-xs text-gray-600 mt-1">john@example.com • (555) 123-4567 • New York, NY</p>
          </div>
        </div>

        {/* Dynamic Grid Layout */}
        <div className="grid grid-cols-5 gap-4">
          {/* Left Column - Skills */}
          <div className="col-span-2 space-y-4">
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-4 rounded-lg">
              <h2 className="text-sm font-black text-purple-900 uppercase mb-3">Skills</h2>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-purple-800">JavaScript</span>
                    <span className="text-purple-600">Expert</span>
                  </div>
                  <div className="h-1.5 bg-purple-200 rounded-full overflow-hidden">
                    <div className="h-full w-[90%] bg-gradient-to-r from-purple-600 to-pink-600"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-purple-800">React</span>
                    <span className="text-purple-600">Expert</span>
                  </div>
                  <div className="h-1.5 bg-purple-200 rounded-full overflow-hidden">
                    <div className="h-full w-[85%] bg-gradient-to-r from-purple-600 to-pink-600"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-purple-800">Design</span>
                    <span className="text-purple-600">Advanced</span>
                  </div>
                  <div className="h-1.5 bg-purple-200 rounded-full overflow-hidden">
                    <div className="h-full w-[75%] bg-gradient-to-r from-purple-600 to-pink-600"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-pink-100 to-purple-100 p-4 rounded-lg">
              <h2 className="text-sm font-black text-purple-900 uppercase mb-2">Education</h2>
              <div className="text-xs">
                <p className="font-bold text-purple-800">BS Computer Science</p>
                <p className="text-gray-700">University Name</p>
                <p className="text-purple-600 font-semibold">2019 • GPA 3.8</p>
              </div>
            </div>
          </div>

          {/* Right Column - Experience */}
          <div className="col-span-3 space-y-4">
            <div>
              <h2 className="text-sm font-black text-purple-900 uppercase mb-3 pb-2 border-b-2 border-purple-300">Experience</h2>
              <div className="space-y-4">
                <div className="relative pl-6">
                  <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-gradient-to-br from-purple-600 to-pink-600"></div>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-black text-sm text-purple-900">Senior Software Engineer</h3>
                    <span className="text-xs font-bold text-purple-600">2021 - Now</span>
                  </div>
                  <p className="text-xs font-bold text-purple-700 mb-2">Tech Company Inc.</p>
                  <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
                    <li>Built scalable microservices architecture</li>
                    <li>Led innovation initiatives and team growth</li>
                    <li>Drove 40% performance improvements</li>
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
