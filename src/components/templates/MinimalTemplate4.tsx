import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const MinimalTemplate4 = ({ data, isPreview = true }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-white text-black ${isPreview ? 'scale-[0.4] origin-top-left w-[210mm] h-[297mm]' : 'w-full'} p-10 shadow-none border-2 border-border`}>
      <div className="space-y-6">
        {/* Two-line Header */}
        <div className="flex justify-between items-end pb-3 border-b border-black">
          <h1 className="text-2xl font-bold text-gray-900">{d.contact.name || "Your Name"}</h1>
          <div className="text-right text-[10px] text-gray-600 space-y-0.5">
            {d.contact.email && <p>{d.contact.email}</p>}
            {d.contact.phone && <p>{d.contact.phone}</p>}
            {d.contact.location && <p>{d.contact.location}</p>}
          </div>
        </div>

        {/* Summary */}
        {d.summary && (
          <p className="text-xs text-gray-700 leading-relaxed">{d.summary}</p>
        )}

        {/* Experience */}
        {d.experience.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 pb-1 border-b border-gray-300">Experience</h2>
            <div className="space-y-3">
              {d.experience.map((exp) => (
                <div key={exp.id}>
                  <div className="flex justify-between items-baseline">
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-bold text-sm text-gray-900">{exp.title}</h3>
                      <span className="text-xs text-gray-500">at {exp.company}</span>
                    </div>
                    <span className="text-[10px] text-gray-500">{exp.startDate}–{exp.endDate}</span>
                  </div>
                  {exp.bullets.length > 0 && (
                    <ul className="mt-1.5 text-xs text-gray-600 space-y-0.5 list-disc ml-4">
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
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 pb-1 border-b border-gray-300">Education</h2>
            {d.education.map((edu) => (
              <div key={edu.id} className="flex justify-between items-baseline mb-1">
                <span className="text-xs text-gray-800"><strong>{edu.degree}</strong> — {edu.school}</span>
                <span className="text-[10px] text-gray-500">{edu.graduationDate}</span>
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        {d.skills.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-1 pb-1 border-b border-gray-300">Skills</h2>
            <p className="text-xs text-gray-700">{d.skills.join(" • ")}</p>
          </div>
        )}
      </div>
    </Card>
  );
};
