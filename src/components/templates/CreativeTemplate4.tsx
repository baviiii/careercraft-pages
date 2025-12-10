import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const CreativeTemplate4 = ({ data, isPreview = true }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-amber-50 text-black ${isPreview ? 'scale-[0.35] origin-top-left w-[794px] min-h-[1123px]' : 'w-[794px] min-h-[1123px]'} p-8 shadow-none border-0 overflow-hidden`} style={{ boxSizing: 'border-box' }}>
      <div className="space-y-5">
        {/* Retro Header */}
        <div className="relative pb-4">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500"></div>
          <div className="pt-5">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{d.contact.name || "Your Name"}</h1>
            <div className="flex gap-3 mt-2 text-xs text-amber-800">
              {d.contact.email && <span className="border-b border-amber-400">{d.contact.email}</span>}
              {d.contact.phone && <span className="border-b border-orange-400">{d.contact.phone}</span>}
              {d.contact.location && <span className="border-b border-red-400">{d.contact.location}</span>}
            </div>
          </div>
        </div>

        {/* Summary */}
        {d.summary && (
          <div className="border-l-4 border-amber-500 pl-4 py-2 bg-white/50">
            <p className="text-xs text-gray-700 leading-relaxed italic">{d.summary}</p>
          </div>
        )}

        {/* Experience */}
        {d.experience.length > 0 && (
          <div>
            <h2 className="text-sm font-black text-amber-700 uppercase mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-amber-500 text-white rounded flex items-center justify-center text-[10px]">✦</span>
              Work Experience
            </h2>
            <div className="space-y-4">
              {d.experience.map((exp) => (
                <div key={exp.id} className="bg-white/70 p-4 rounded-lg border border-amber-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">{exp.title}</h3>
                      <p className="text-xs text-orange-600 font-semibold">{exp.company}</p>
                    </div>
                    <span className="text-[10px] text-amber-700 font-medium">{exp.startDate} → {exp.endDate}</span>
                  </div>
                  {exp.bullets.length > 0 && (
                    <ul className="mt-2 text-xs text-gray-700 space-y-0.5 list-disc ml-4">
                      {exp.bullets.filter(b => b.trim()).map((bullet, idx) => (
                        <li key={idx}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 gap-4">
          {d.education.length > 0 && (
            <div className="bg-white/70 p-4 rounded-lg border border-amber-200">
              <h2 className="text-xs font-black text-amber-700 uppercase mb-2 flex items-center gap-2">
                <span className="w-4 h-4 bg-orange-500 text-white rounded flex items-center justify-center text-[8px]">✦</span>
                Education
              </h2>
              {d.education.map((edu) => (
                <div key={edu.id} className="mb-2">
                  <h3 className="font-bold text-xs text-gray-900">{edu.degree}</h3>
                  <p className="text-[10px] text-gray-600">{edu.school}</p>
                  <p className="text-[10px] text-amber-600">{edu.graduationDate}</p>
                </div>
              ))}
            </div>
          )}

          {d.skills.length > 0 && (
            <div className="bg-white/70 p-4 rounded-lg border border-amber-200">
              <h2 className="text-xs font-black text-amber-700 uppercase mb-2 flex items-center gap-2">
                <span className="w-4 h-4 bg-red-500 text-white rounded flex items-center justify-center text-[8px]">✦</span>
                Skills
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {d.skills.map((skill, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-gradient-to-r from-amber-200 to-orange-200 text-amber-800 text-[10px] rounded font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
