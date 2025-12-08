import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const ModernTemplate4 = ({ data, isPreview = true }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-white text-black ${isPreview ? 'scale-[0.4] origin-top-left w-[210mm] h-[297mm]' : 'w-full'} p-8 shadow-none border-2 border-border`}>
      <div className="space-y-5">
        {/* Split Header */}
        <div className="flex justify-between items-end pb-4 border-b-2 border-indigo-500">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">{d.contact.name || "Your Name"}</h1>
            {d.contact.linkedin && (
              <p className="text-xs text-indigo-600 mt-1">{d.contact.linkedin}</p>
            )}
          </div>
          <div className="text-right text-xs text-gray-600">
            <p>{d.contact.email}</p>
            <p>{d.contact.phone}</p>
            <p>{d.contact.location}</p>
          </div>
        </div>

        {/* Summary with Icon */}
        {d.summary && (
          <div className="bg-indigo-50 p-4 rounded-lg">
            <p className="text-xs text-gray-700 leading-relaxed italic">{d.summary}</p>
          </div>
        )}

        {/* Experience */}
        {d.experience.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-indigo-600 mb-3 flex items-center gap-2">
              <span className="w-8 h-0.5 bg-indigo-600"></span>
              EXPERIENCE
            </h2>
            <div className="space-y-4">
              {d.experience.map((exp) => (
                <div key={exp.id}>
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-bold text-sm text-gray-900">{exp.title}</h3>
                    <span className="text-xs text-gray-500">{exp.startDate} — {exp.endDate}</span>
                  </div>
                  <p className="text-xs text-indigo-600 font-medium">{exp.company}{exp.location ? `, ${exp.location}` : ""}</p>
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

        {/* Education */}
        {d.education.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-indigo-600 mb-3 flex items-center gap-2">
              <span className="w-8 h-0.5 bg-indigo-600"></span>
              EDUCATION
            </h2>
            {d.education.map((edu) => (
              <div key={edu.id} className="flex justify-between items-baseline mb-2">
                <div>
                  <h3 className="font-bold text-xs text-gray-900">{edu.degree}</h3>
                  <p className="text-xs text-gray-600">{edu.school}{edu.location ? `, ${edu.location}` : ""}</p>
                </div>
                <span className="text-xs text-gray-500">{edu.graduationDate}</span>
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        {d.skills.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-indigo-600 mb-2 flex items-center gap-2">
              <span className="w-8 h-0.5 bg-indigo-600"></span>
              SKILLS
            </h2>
            <div className="flex flex-wrap gap-2">
              {d.skills.map((skill, idx) => (
                <span key={idx} className="px-3 py-1 border border-indigo-200 text-indigo-700 text-xs font-medium rounded-full">
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
