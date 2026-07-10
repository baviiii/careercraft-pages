import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const ModernTemplate7 = ({ data }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-slate-50 text-black w-[794px] min-h-[1123px] p-8 shadow-none border-0 overflow-hidden`} style={{ boxSizing: 'border-box' }}>
      <div className="space-y-5">
        {/* Header with background card */}
        <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200">
          <h1 className="text-2xl font-bold text-slate-800">{d.contact.name || "Your Name"}</h1>
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-600">
            {d.contact.email && <span className="flex items-center gap-1">📧 {d.contact.email}</span>}
            {d.contact.phone && <span className="flex items-center gap-1">📱 {d.contact.phone}</span>}
            {d.contact.location && <span className="flex items-center gap-1">📍 {d.contact.location}</span>}
          </div>
        </div>

        {/* Summary Card */}
        {d.summary && (
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <h2 className="text-xs font-bold text-slate-500 uppercase mb-2">About</h2>
            <p className="text-xs text-slate-700 leading-relaxed">{d.summary}</p>
          </div>
        )}

        {/* Experience Cards */}
        {d.experience.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase mb-3 px-1">Experience</h2>
            <div className="space-y-3">
              {d.experience.map((exp) => (
                <div key={exp.id} className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm text-slate-800">{exp.title}</h3>
                      <p className="text-xs text-cyan-600 font-medium">{exp.company}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded">{exp.startDate} - {exp.endDate}</span>
                  </div>
                  {exp.bullets.length > 0 && (
                    <ul className="mt-2 text-xs text-slate-700 space-y-0.5 list-disc ml-4">
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

        {/* Bottom row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Education */}
          {d.education.length > 0 && (
            <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
              <h2 className="text-xs font-bold text-slate-500 uppercase mb-2">Education</h2>
              {d.education.map((edu) => (
                <div key={edu.id} className="mb-2">
                  <h3 className="font-bold text-xs text-slate-800">{edu.degree}</h3>
                  <p className="text-[10px] text-slate-600">{edu.school}</p>
                  <p className="text-[10px] text-slate-500">{edu.graduationDate}</p>
                </div>
              ))}
            </div>
          )}

          {/* Skills */}
          {d.skills.length > 0 && (
            <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
              <h2 className="text-xs font-bold text-slate-500 uppercase mb-2">Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {d.skills.map((skill, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-cyan-50 text-cyan-700 text-[10px] rounded-full border border-cyan-200">
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
