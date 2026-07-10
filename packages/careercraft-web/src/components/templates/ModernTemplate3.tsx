import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const ModernTemplate3 = ({ data }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-white text-black w-[794px] min-h-[1123px] p-0 shadow-none border-0 overflow-hidden`} style={{ boxSizing: 'border-box' }}>
      {/* Teal Header */}
      <div className="bg-teal-600 text-white px-8 py-6">
        <h1 className="text-3xl font-bold tracking-tight">{d.contact.name || "Your Name"}</h1>
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-teal-100">
          {d.contact.email && <span>{d.contact.email}</span>}
          {d.contact.phone && <span>{d.contact.phone}</span>}
          {d.contact.location && <span>{d.contact.location}</span>}
        </div>
      </div>

      <div className="p-8 space-y-5">
        {/* Summary */}
        {d.summary && (
          <div>
            <h2 className="text-sm font-bold text-teal-600 uppercase tracking-widest mb-2">About Me</h2>
            <p className="text-xs text-gray-700 leading-relaxed">{d.summary}</p>
          </div>
        )}

        {/* Experience */}
        {d.experience.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-teal-600 uppercase tracking-widest mb-3">Work Experience</h2>
            <div className="space-y-4">
              {d.experience.map((exp) => (
                <div key={exp.id} className="border-l-2 border-teal-200 pl-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm text-gray-900">{exp.title}</h3>
                    <span className="text-xs text-teal-600 font-medium">{exp.startDate} - {exp.endDate}</span>
                  </div>
                  <p className="text-xs text-gray-600">{exp.company}{exp.location ? ` • ${exp.location}` : ""}</p>
                  {exp.bullets.length > 0 && (
                    <ul className="mt-2 text-xs text-gray-700 space-y-1 list-disc list-inside">
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

        {/* Two Column Section */}
        <div className="grid grid-cols-2 gap-6">
          {/* Education */}
          {d.education.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-teal-600 uppercase tracking-widest mb-2">Education</h2>
              {d.education.map((edu) => (
                <div key={edu.id} className="mb-2">
                  <h3 className="font-bold text-xs text-gray-900">{edu.degree}</h3>
                  <p className="text-xs text-gray-600">{edu.school}</p>
                  <p className="text-xs text-gray-500">{edu.graduationDate}</p>
                </div>
              ))}
            </div>
          )}

          {/* Skills */}
          {d.skills.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-teal-600 uppercase tracking-widest mb-2">Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {d.skills.map((skill, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs rounded">
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
