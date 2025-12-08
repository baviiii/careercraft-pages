import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const ProfessionalTemplate3 = ({ data, isPreview = true }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-white text-black ${isPreview ? 'scale-[0.4] origin-top-left w-[210mm] h-[297mm]' : 'w-full'} shadow-none border-2 border-border overflow-hidden`}>
      {/* Navy Header */}
      <div className="bg-slate-800 text-white px-8 py-5">
        <h1 className="text-2xl font-bold">{d.contact.name?.toUpperCase() || "YOUR NAME"}</h1>
        <div className="flex gap-4 mt-1.5 text-xs text-slate-300">
          {d.contact.email && <span>{d.contact.email}</span>}
          {d.contact.phone && <span>{d.contact.phone}</span>}
          {d.contact.location && <span>{d.contact.location}</span>}
        </div>
      </div>

      <div className="p-8 space-y-5">
        {/* Executive Summary */}
        {d.summary && (
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-2 pb-1 border-b-2 border-slate-800">Executive Summary</h2>
            <p className="text-xs text-gray-700 leading-relaxed">{d.summary}</p>
          </div>
        )}

        {/* Professional History */}
        {d.experience.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-3 pb-1 border-b-2 border-slate-800">Professional History</h2>
            <div className="space-y-4">
              {d.experience.map((exp) => (
                <div key={exp.id}>
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-bold text-sm text-gray-900">{exp.title}</h3>
                    <span className="text-xs text-gray-600">{exp.startDate} — {exp.endDate}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-semibold">{exp.company} | {exp.location}</p>
                  {exp.bullets.length > 0 && (
                    <ul className="mt-2 text-xs text-gray-700 space-y-1 list-disc ml-4">
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

        <div className="grid grid-cols-2 gap-6">
          {/* Education */}
          {d.education.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-2 pb-1 border-b-2 border-slate-800">Education</h2>
              {d.education.map((edu) => (
                <div key={edu.id} className="mb-2">
                  <h3 className="font-bold text-xs text-gray-900">{edu.degree}</h3>
                  <p className="text-[10px] text-gray-600">{edu.school}</p>
                  <p className="text-[10px] text-gray-500">{edu.graduationDate}{edu.gpa ? ` • GPA: ${edu.gpa}` : ""}</p>
                </div>
              ))}
            </div>
          )}

          {/* Key Skills */}
          {d.skills.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-2 pb-1 border-b-2 border-slate-800">Key Skills</h2>
              <div className="text-xs text-gray-700 space-y-0.5">
                {d.skills.map((skill, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                    {skill}
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
