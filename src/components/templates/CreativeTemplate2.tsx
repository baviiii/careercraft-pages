import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const CreativeTemplate2 = ({ data, isPreview = true }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-black text-white ${isPreview ? 'scale-[0.4] origin-top-left w-[210mm] h-[297mm]' : 'w-full'} p-8 shadow-none border-2 border-orange-500`}>
      <div className="space-y-6">
        {/* Bold Header with Geometric Elements */}
        <div className="relative pb-6 border-b-4 border-orange-500">
          <div className="absolute -top-4 -left-4 w-16 h-16 bg-orange-500 opacity-20 rotate-45"></div>
          <h1 className="text-5xl font-black text-white mb-1 tracking-tight">{d.contact.name?.toUpperCase() || "YOUR NAME"}</h1>
          <p className="text-orange-500 font-bold text-lg tracking-wide">{d.experience[0]?.title?.toUpperCase() || "PROFESSIONAL TITLE"}</p>
          <p className="text-xs text-gray-400 mt-2">
            {[d.contact.email, d.contact.phone, d.contact.location].filter(Boolean).join(" • ")}
          </p>
        </div>

        {/* Unique Diagonal Layout */}
        <div className="space-y-5">
          {/* About */}
          {d.summary && (
            <div className="bg-gradient-to-r from-orange-500/20 to-transparent p-4 border-l-4 border-orange-500">
              <h2 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-2">About</h2>
              <p className="text-xs text-gray-300 leading-relaxed">{d.summary}</p>
            </div>
          )}

          {/* Experience with Unique Style */}
          {d.experience.length > 0 && (
            <div>
              <h2 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-4 flex items-center">
                <span className="flex-1 h-px bg-orange-500 mr-3"></span>
                Experience
              </h2>
              <div className="space-y-4">
                {d.experience.map((exp) => (
                  <div key={exp.id} className="relative pl-8 pb-4 border-l-2 border-gray-700">
                    <div className="absolute -left-2 top-0 w-4 h-4 bg-orange-500 rotate-45"></div>
                    <div className="bg-gray-900/50 p-3 rounded border border-gray-800">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-black text-sm text-white">{exp.title}</h3>
                          <p className="text-xs text-orange-500 font-bold">{exp.company}</p>
                        </div>
                        <span className="text-xs font-bold text-gray-400">{exp.startDate} - {exp.endDate}</span>
                      </div>
                      {exp.bullets.length > 0 && (
                        <ul className="text-xs text-gray-300 space-y-1">
                          {exp.bullets.filter(b => b.trim()).map((bullet, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="text-orange-500 mr-2">▸</span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills Grid */}
          {d.skills.length > 0 && (
            <div>
              <h2 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-3 flex items-center">
                <span className="flex-1 h-px bg-orange-500 mr-3"></span>
                Skills
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {d.skills.slice(0, 9).map((skill, idx) => (
                  <div key={idx} className="bg-gray-900 border border-orange-500/30 p-2 text-center hover:border-orange-500 transition-colors">
                    <span className="text-xs font-bold text-white">{skill}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
