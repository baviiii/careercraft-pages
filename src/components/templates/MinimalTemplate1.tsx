import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const MinimalTemplate1 = ({ data, isPreview = true }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-white text-black ${isPreview ? 'scale-[0.4] origin-top-left w-[210mm] h-[297mm]' : 'w-full'} p-10 shadow-none border-2 border-border`}>
      <div className="space-y-6">
        {/* Ultra Clean Header */}
        <div className="pb-4">
          <h1 className="text-3xl font-light text-gray-900 tracking-wide">{d.contact.name || "Your Name"}</h1>
          <div className="flex gap-6 mt-3 text-xs text-gray-500">
            {d.contact.email && <span>{d.contact.email}</span>}
            {d.contact.phone && <span>{d.contact.phone}</span>}
            {d.contact.location && <span>{d.contact.location}</span>}
          </div>
        </div>

        {/* Summary */}
        {d.summary && (
          <div>
            <p className="text-xs text-gray-600 leading-relaxed">{d.summary}</p>
          </div>
        )}

        {/* Experience */}
        {d.experience.length > 0 && (
          <div>
            <h2 className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.3em] mb-4">Experience</h2>
            <div className="space-y-5">
              {d.experience.map((exp) => (
                <div key={exp.id}>
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-sm font-medium text-gray-900">{exp.title}</h3>
                    <span className="text-[10px] text-gray-400">{exp.startDate} — {exp.endDate}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{exp.company}</p>
                  {exp.bullets.length > 0 && (
                    <ul className="mt-2 text-xs text-gray-600 space-y-1">
                      {exp.bullets.filter(b => b.trim()).map((bullet, idx) => (
                        <li key={idx} className="pl-3 relative before:absolute before:left-0 before:top-2 before:w-1 before:h-1 before:bg-gray-300 before:rounded-full">
                          {bullet}
                        </li>
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
            <h2 className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.3em] mb-3">Education</h2>
            {d.education.map((edu) => (
              <div key={edu.id} className="flex justify-between items-baseline mb-2">
                <div>
                  <h3 className="text-xs font-medium text-gray-900">{edu.degree}</h3>
                  <p className="text-[10px] text-gray-500">{edu.school}</p>
                </div>
                <span className="text-[10px] text-gray-400">{edu.graduationDate}</span>
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        {d.skills.length > 0 && (
          <div>
            <h2 className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.3em] mb-2">Skills</h2>
            <p className="text-xs text-gray-600">{d.skills.join("  ·  ")}</p>
          </div>
        )}
      </div>
    </Card>
  );
};
