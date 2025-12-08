import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const MinimalTemplate3 = ({ data, isPreview = true }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-white text-black ${isPreview ? 'scale-[0.4] origin-top-left w-[210mm] h-[297mm]' : 'w-full'} shadow-none border-2 border-border`}>
      <div className="flex h-full">
        {/* Left column - narrow */}
        <div className="w-1/4 bg-gray-100 p-6 space-y-6">
          {/* Contact */}
          <div>
            <h2 className="text-[9px] font-medium text-gray-400 uppercase tracking-widest mb-2">Contact</h2>
            <div className="space-y-1.5 text-[10px] text-gray-600">
              {d.contact.email && <p>{d.contact.email}</p>}
              {d.contact.phone && <p>{d.contact.phone}</p>}
              {d.contact.location && <p>{d.contact.location}</p>}
            </div>
          </div>

          {/* Skills */}
          {d.skills.length > 0 && (
            <div>
              <h2 className="text-[9px] font-medium text-gray-400 uppercase tracking-widest mb-2">Skills</h2>
              <div className="space-y-1">
                {d.skills.map((skill, idx) => (
                  <p key={idx} className="text-[10px] text-gray-600">{skill}</p>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {d.education.length > 0 && (
            <div>
              <h2 className="text-[9px] font-medium text-gray-400 uppercase tracking-widest mb-2">Education</h2>
              {d.education.map((edu) => (
                <div key={edu.id} className="mb-3">
                  <p className="text-[10px] font-medium text-gray-700">{edu.degree}</p>
                  <p className="text-[9px] text-gray-500">{edu.school}</p>
                  <p className="text-[9px] text-gray-400">{edu.graduationDate}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column - main content */}
        <div className="flex-1 p-8 space-y-5">
          {/* Name */}
          <div className="pb-3 border-b border-gray-200">
            <h1 className="text-2xl font-light text-gray-900">{d.contact.name || "Your Name"}</h1>
          </div>

          {/* Summary */}
          {d.summary && (
            <p className="text-xs text-gray-600 leading-relaxed">{d.summary}</p>
          )}

          {/* Experience */}
          {d.experience.length > 0 && (
            <div>
              <h2 className="text-[9px] font-medium text-gray-400 uppercase tracking-widest mb-4">Experience</h2>
              <div className="space-y-4">
                {d.experience.map((exp) => (
                  <div key={exp.id}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-sm font-medium text-gray-900">{exp.title}</h3>
                      <span className="text-[9px] text-gray-400">{exp.startDate} — {exp.endDate}</span>
                    </div>
                    <p className="text-[10px] text-gray-500">{exp.company}{exp.location ? `, ${exp.location}` : ""}</p>
                    {exp.bullets.length > 0 && (
                      <ul className="mt-2 text-[10px] text-gray-600 space-y-0.5 list-disc ml-4">
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
        </div>
      </div>
    </Card>
  );
};
