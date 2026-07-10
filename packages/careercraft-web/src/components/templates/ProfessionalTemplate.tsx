import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const ProfessionalTemplate = ({ data }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-white text-black w-[794px] min-h-[1123px] p-8 shadow-none border-0 overflow-hidden`} style={{ boxSizing: 'border-box' }}>
      <div className="space-y-5">
        {/* Classic Header */}
        <div className="text-center pb-3 border-b-2 border-black">
          <h1 className="text-3xl font-serif font-bold text-black mb-1">{d.contact.name?.toUpperCase() || "YOUR NAME"}</h1>
          <p className="text-xs text-gray-700">
            {[d.contact.email, d.contact.phone, d.contact.location].filter(Boolean).join(" • ")}
          </p>
        </div>

        {/* Summary */}
        {d.summary && (
          <div>
            <h2 className="text-sm font-bold text-black uppercase tracking-wider mb-2 border-b border-gray-400 pb-1">Professional Summary</h2>
            <p className="text-xs text-gray-800 leading-relaxed">{d.summary}</p>
          </div>
        )}

        {/* Experience */}
        {d.experience.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-black uppercase tracking-wider mb-2 border-b border-gray-400 pb-1">Professional Experience</h2>
            <div className="space-y-3">
              {d.experience.map((exp) => (
                <div key={exp.id}>
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-bold text-sm text-black">{exp.title}</h3>
                    <span className="text-xs text-gray-600">{exp.startDate} - {exp.endDate}</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">
                    {exp.company}{exp.location ? `, ${exp.location}` : ""}
                  </p>
                  {exp.bullets.length > 0 && (
                    <ul className="text-xs text-gray-800 space-y-0.5 ml-4" style={{ listStyleType: 'disc' }}>
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
            <h2 className="text-sm font-bold text-black uppercase tracking-wider mb-2 border-b border-gray-400 pb-1">Education</h2>
            {d.education.map((edu) => (
              <div key={edu.id} className="mb-2">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-bold text-sm text-black">{edu.degree}</h3>
                  <span className="text-xs text-gray-600">{edu.graduationDate}</span>
                </div>
                <p className="text-xs text-gray-700">
                  {edu.school}{edu.location ? `, ${edu.location}` : ""}{edu.gpa ? ` • GPA: ${edu.gpa}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        {d.skills.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-black uppercase tracking-wider mb-2 border-b border-gray-400 pb-1">Technical Skills</h2>
            <p className="text-xs text-gray-800">{d.skills.join(" • ")}</p>
          </div>
        )}
      </div>
    </Card>
  );
};
