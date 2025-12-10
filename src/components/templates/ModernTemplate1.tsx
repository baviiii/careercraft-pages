import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TemplateProps, defaultTemplateData } from "./types";

export const ModernTemplate1 = ({ data, isPreview = true }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-white text-black ${isPreview ? 'scale-[0.35] origin-top-left w-[794px] min-h-[1123px]' : 'w-[794px] min-h-[1123px]'} p-8 shadow-none border-0 overflow-hidden`} style={{ boxSizing: 'border-box' }}>
      <div className="space-y-6">
        {/* Header with accent bar */}
        <div className="border-l-4 border-blue-600 pl-4">
          <h1 className="text-3xl font-bold text-gray-900">{d.contact.name || "Your Name"}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {[d.contact.email, d.contact.phone, d.contact.location].filter(Boolean).join(" | ")}
          </p>
        </div>

        {/* Summary */}
        {d.summary && (
          <div>
            <h2 className="text-lg font-bold text-blue-600 mb-2">PROFESSIONAL SUMMARY</h2>
            <Separator className="mb-3 bg-blue-600" />
            <p className="text-sm text-gray-700 leading-relaxed">{d.summary}</p>
          </div>
        )}

        {/* Experience */}
        {d.experience.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-blue-600 mb-2">EXPERIENCE</h2>
            <Separator className="mb-3 bg-blue-600" />
            <div className="space-y-4">
              {d.experience.map((exp) => (
                <div key={exp.id}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900">{exp.title}</h3>
                      <p className="text-sm text-gray-600">{exp.company}{exp.location ? `, ${exp.location}` : ""}</p>
                    </div>
                    <span className="text-xs text-gray-500">{exp.startDate} - {exp.endDate}</span>
                  </div>
                  {exp.bullets.length > 0 && (
                    <ul className="mt-2 text-sm text-gray-700 space-y-1 list-disc list-inside">
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
            <h2 className="text-lg font-bold text-blue-600 mb-2">EDUCATION</h2>
            <Separator className="mb-3 bg-blue-600" />
            <div className="space-y-2">
              {d.education.map((edu) => (
                <div key={edu.id}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900">{edu.degree}</h3>
                      <p className="text-sm text-gray-600">{edu.school}{edu.location ? `, ${edu.location}` : ""}</p>
                    </div>
                    <span className="text-xs text-gray-500">{edu.graduationDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {d.skills.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-blue-600 mb-2">SKILLS</h2>
            <Separator className="mb-3 bg-blue-600" />
            <div className="flex flex-wrap gap-2">
              {d.skills.map((skill, idx) => (
                <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
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
