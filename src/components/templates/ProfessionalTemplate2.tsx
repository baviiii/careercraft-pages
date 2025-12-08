import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const ProfessionalTemplate2 = ({ data, isPreview = true }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-white text-black ${isPreview ? 'scale-[0.4] origin-top-left w-[210mm] h-[297mm]' : 'w-full'} p-8 shadow-none border-2 border-border`}>
      <div className="space-y-5">
        {/* Traditional Header */}
        <div className="border-b border-gray-300 pb-4">
          <h1 className="text-2xl font-serif text-gray-900">{d.contact.name || "Your Name"}</h1>
          <div className="flex gap-4 mt-2 text-xs text-gray-600">
            {d.contact.email && <span>{d.contact.email}</span>}
            {d.contact.phone && <span>{d.contact.phone}</span>}
            {d.contact.location && <span>{d.contact.location}</span>}
          </div>
        </div>

        {/* Objective/Summary */}
        {d.summary && (
          <div>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-2">Objective</h2>
            <p className="text-xs text-gray-700 leading-relaxed pl-4 border-l-2 border-gray-200">{d.summary}</p>
          </div>
        )}

        {/* Professional Experience */}
        {d.experience.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Professional Experience</h2>
            <div className="space-y-4">
              {d.experience.map((exp) => (
                <div key={exp.id}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">{exp.title}</h3>
                      <p className="text-xs text-gray-700">{exp.company}, {exp.location}</p>
                    </div>
                    <span className="text-xs text-gray-600 italic">{exp.startDate} - {exp.endDate}</span>
                  </div>
                  {exp.bullets.length > 0 && (
                    <ul className="mt-2 text-xs text-gray-700 space-y-1" style={{ listStyleType: 'square', marginLeft: '1rem' }}>
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
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Education</h2>
            {d.education.map((edu) => (
              <div key={edu.id} className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-xs text-gray-900">{edu.degree}</h3>
                  <p className="text-xs text-gray-600">{edu.school}, {edu.location}</p>
                </div>
                <span className="text-xs text-gray-600">{edu.graduationDate}{edu.gpa ? ` | GPA: ${edu.gpa}` : ""}</span>
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        {d.skills.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-2">Core Competencies</h2>
            <p className="text-xs text-gray-700">{d.skills.join(" | ")}</p>
          </div>
        )}
      </div>
    </Card>
  );
};
