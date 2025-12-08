import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const MinimalTemplate2 = ({ data, isPreview = true }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-gray-50 text-black ${isPreview ? 'scale-[0.4] origin-top-left w-[210mm] h-[297mm]' : 'w-full'} p-8 shadow-none border-2 border-border`}>
      <div className="max-w-xl mx-auto space-y-6">
        {/* Centered Simple Header */}
        <div className="text-center pb-4 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900">{d.contact.name || "Your Name"}</h1>
          <p className="text-xs text-gray-500 mt-2">
            {[d.contact.email, d.contact.phone, d.contact.location].filter(Boolean).join("  |  ")}
          </p>
        </div>

        {/* Summary */}
        {d.summary && (
          <p className="text-xs text-gray-600 leading-relaxed text-center">{d.summary}</p>
        )}

        {/* Experience */}
        {d.experience.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4 text-center">Work</h2>
            <div className="space-y-4">
              {d.experience.map((exp) => (
                <div key={exp.id} className="bg-white rounded p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900">{exp.title}</h3>
                      <p className="text-xs text-gray-500">{exp.company}</p>
                    </div>
                    <span className="text-[10px] text-gray-400">{exp.startDate} - {exp.endDate}</span>
                  </div>
                  {exp.bullets.length > 0 && (
                    <ul className="mt-2 text-xs text-gray-600 space-y-1 list-disc ml-4">
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

        {/* Education */}
        {d.education.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3 text-center">Education</h2>
            <div className="bg-white rounded p-4">
              {d.education.map((edu) => (
                <div key={edu.id} className="flex justify-between items-start mb-2 last:mb-0">
                  <div>
                    <h3 className="font-semibold text-xs text-gray-900">{edu.degree}</h3>
                    <p className="text-[10px] text-gray-500">{edu.school}</p>
                  </div>
                  <span className="text-[10px] text-gray-400">{edu.graduationDate}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {d.skills.length > 0 && (
          <div className="text-center">
            <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2">Skills</h2>
            <div className="flex flex-wrap justify-center gap-2">
              {d.skills.map((skill, idx) => (
                <span key={idx} className="px-2 py-1 bg-white text-gray-700 text-[10px] rounded">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
