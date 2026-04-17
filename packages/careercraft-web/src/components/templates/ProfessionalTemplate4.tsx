import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const ProfessionalTemplate4 = ({ data, isPreview = true }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-white text-black ${isPreview ? 'scale-[0.35] origin-top-left w-[794px] min-h-[1123px]' : 'w-[794px] min-h-[1123px]'} p-8 shadow-none border-0 overflow-hidden`} style={{ boxSizing: 'border-box' }}>
      <div className="space-y-5">
        {/* Centered Traditional Header */}
        <div className="text-center pb-4 border-b border-gray-400">
          <h1 className="text-3xl font-serif font-bold text-gray-900 tracking-wide">{d.contact.name || "Your Name"}</h1>
          <p className="text-xs text-gray-600 mt-2">
            {[d.contact.location, d.contact.phone, d.contact.email].filter(Boolean).join(" · ")}
          </p>
          {d.contact.linkedin && (
            <p className="text-xs text-gray-500 mt-1">{d.contact.linkedin}</p>
          )}
        </div>

        {/* Profile */}
        {d.summary && (
          <div>
            <h2 className="text-sm font-serif font-bold text-gray-800 mb-2">PROFILE</h2>
            <p className="text-xs text-gray-700 leading-relaxed">{d.summary}</p>
          </div>
        )}

        {/* Experience */}
        {d.experience.length > 0 && (
          <div>
            <h2 className="text-sm font-serif font-bold text-gray-800 mb-3">EXPERIENCE</h2>
            <div className="space-y-4">
              {d.experience.map((exp) => (
                <div key={exp.id}>
                  <h3 className="font-bold text-sm text-gray-900">{exp.title}</h3>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span className="italic">{exp.company}, {exp.location}</span>
                    <span>{exp.startDate} – {exp.endDate}</span>
                  </div>
                  {exp.bullets.length > 0 && (
                    <ul className="text-xs text-gray-700 space-y-0.5 list-disc ml-4">
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
            <h2 className="text-sm font-serif font-bold text-gray-800 mb-2">EDUCATION</h2>
            {d.education.map((edu) => (
              <div key={edu.id} className="mb-2">
                <div className="flex justify-between">
                  <h3 className="font-bold text-xs text-gray-900">{edu.degree}</h3>
                  <span className="text-xs text-gray-600">{edu.graduationDate}</span>
                </div>
                <p className="text-xs text-gray-600 italic">{edu.school}, {edu.location}</p>
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        {d.skills.length > 0 && (
          <div>
            <h2 className="text-sm font-serif font-bold text-gray-800 mb-2">SKILLS</h2>
            <p className="text-xs text-gray-700">{d.skills.join(", ")}</p>
          </div>
        )}
      </div>
    </Card>
  );
};
