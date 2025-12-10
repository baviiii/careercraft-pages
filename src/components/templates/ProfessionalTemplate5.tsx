import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const ProfessionalTemplate5 = ({ data, isPreview = true }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-white text-black ${isPreview ? 'scale-[0.35] origin-top-left w-[794px] min-h-[1123px]' : 'w-[794px] min-h-[1123px]'} shadow-none border-0 overflow-hidden`} style={{ boxSizing: 'border-box' }}>
      <div className="flex h-full">
        {/* Thin Left Accent Bar */}
        <div className="w-2 bg-gray-800"></div>
        
        <div className="flex-1 p-8 space-y-5">
          {/* Header */}
          <div className="pb-3 border-b-2 border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">{d.contact.name || "Your Name"}</h1>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
              {d.contact.email && <span>✉ {d.contact.email}</span>}
              {d.contact.phone && <span>☎ {d.contact.phone}</span>}
              {d.contact.location && <span>⌂ {d.contact.location}</span>}
            </div>
          </div>

          {/* Summary */}
          {d.summary && (
            <div className="bg-gray-50 p-4 rounded border-l-4 border-gray-800">
              <p className="text-xs text-gray-700 leading-relaxed">{d.summary}</p>
            </div>
          )}

          {/* Experience */}
          {d.experience.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-4 h-4 bg-gray-800 rounded-sm flex items-center justify-center text-white text-[8px]">★</span>
                Work History
              </h2>
              <div className="space-y-4">
                {d.experience.map((exp) => (
                  <div key={exp.id} className="pl-4 border-l border-gray-300">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-bold text-sm text-gray-900">{exp.title}</h3>
                      <span className="text-xs text-gray-500">{exp.startDate} - {exp.endDate}</span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">{exp.company}{exp.location ? `, ${exp.location}` : ""}</p>
                    {exp.bullets.length > 0 && (
                      <ul className="mt-1.5 text-xs text-gray-700 space-y-0.5 list-disc ml-4">
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

          {/* Two columns */}
          <div className="grid grid-cols-2 gap-6">
            {/* Education */}
            {d.education.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <span className="w-4 h-4 bg-gray-800 rounded-sm flex items-center justify-center text-white text-[8px]">★</span>
                  Education
                </h2>
                {d.education.map((edu) => (
                  <div key={edu.id} className="mb-2 pl-4 border-l border-gray-300">
                    <h3 className="font-bold text-xs text-gray-900">{edu.degree}</h3>
                    <p className="text-[10px] text-gray-600">{edu.school}</p>
                    <p className="text-[10px] text-gray-500">{edu.graduationDate}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Skills */}
            {d.skills.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <span className="w-4 h-4 bg-gray-800 rounded-sm flex items-center justify-center text-white text-[8px]">★</span>
                  Expertise
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {d.skills.map((skill, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] border border-gray-200">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
