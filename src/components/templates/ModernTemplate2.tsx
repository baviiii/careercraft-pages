import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const ModernTemplate2 = ({ data, isPreview = true }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-gradient-to-br from-slate-50 to-slate-100 text-black ${isPreview ? 'scale-[0.35] origin-top-left w-[794px] min-h-[1123px]' : 'w-[794px] min-h-[1123px]'} p-8 shadow-none border-0 overflow-hidden`} style={{ boxSizing: 'border-box' }}>
      <div className="space-y-6">
        {/* Centered Header */}
        <div className="text-center pb-4 border-b-2 border-slate-800">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">{d.contact.name?.toUpperCase() || "YOUR NAME"}</h1>
          <p className="text-sm text-slate-600">{d.summary?.slice(0, 60) || "Professional Title"}{d.summary && d.summary.length > 60 ? "..." : ""}</p>
          <p className="text-xs text-slate-500 mt-2">
            {[d.contact.email, d.contact.phone, d.contact.location].filter(Boolean).join(" | ")}
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Sidebar */}
          <div className="space-y-4">
            {d.skills.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-2 pb-1 border-b border-slate-800">Skills</h2>
                <div className="space-y-1 text-xs text-slate-700">
                  {d.skills.slice(0, 8).map((skill, idx) => (
                    <div key={idx}>• {skill}</div>
                  ))}
                </div>
              </div>
            )}
            
            {d.education.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-2 pb-1 border-b border-slate-800">Education</h2>
                {d.education.map((edu) => (
                  <div key={edu.id} className="text-xs text-slate-700 mb-2">
                    <p className="font-semibold">{edu.degree}</p>
                    <p className="text-slate-600">{edu.school}</p>
                    <p className="text-slate-500">{edu.graduationDate}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Content */}
          <div className="col-span-2 space-y-4">
            {d.experience.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3 pb-1 border-b border-slate-800">Experience</h2>
                <div className="space-y-3">
                  {d.experience.map((exp) => (
                    <div key={exp.id}>
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-sm text-slate-900">{exp.title}</h3>
                        <span className="text-xs text-slate-500">{exp.startDate} - {exp.endDate}</span>
                      </div>
                      <p className="text-xs text-slate-600 mb-1">{exp.company}{exp.location ? ` • ${exp.location}` : ""}</p>
                      {exp.bullets.length > 0 && (
                        <ul className="text-xs text-slate-700 space-y-0.5 list-disc list-inside">
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
      </div>
    </Card>
  );
};
