import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const CreativeTemplate6 = ({ data, isPreview = true }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-stone-100 text-black ${isPreview ? 'scale-[0.35] origin-top-left w-[794px] min-h-[1123px]' : 'w-[794px] min-h-[1123px]'} shadow-none border-0 overflow-hidden`} style={{ boxSizing: 'border-box' }}>
      <div className="flex h-full">
        {/* Green Sidebar */}
        <div className="w-1/3 bg-gradient-to-b from-green-600 to-emerald-700 text-white p-5">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold mb-4">
            {(d.contact.name || "YN").split(" ").map(n => n[0]).join("").slice(0, 2)}
          </div>
          
          <h1 className="text-lg font-bold leading-tight mb-4">{d.contact.name || "Your Name"}</h1>
          
          {/* Contact */}
          <div className="space-y-2 text-xs mb-6">
            {d.contact.email && <p className="text-green-100">📧 {d.contact.email}</p>}
            {d.contact.phone && <p className="text-green-100">📱 {d.contact.phone}</p>}
            {d.contact.location && <p className="text-green-100">📍 {d.contact.location}</p>}
          </div>

          {/* Skills */}
          {d.skills.length > 0 && (
            <div>
              <h3 className="text-green-200 uppercase text-[10px] tracking-widest font-semibold mb-2">Skills</h3>
              <div className="space-y-1.5">
                {d.skills.map((skill, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-green-800 rounded-full overflow-hidden">
                      <div className="h-full bg-green-300 rounded-full" style={{ width: `${85 - (idx * 5)}%` }}></div>
                    </div>
                    <span className="text-[9px] text-green-200 w-16 truncate">{skill}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {d.education.length > 0 && (
            <div className="mt-6">
              <h3 className="text-green-200 uppercase text-[10px] tracking-widest font-semibold mb-2">Education</h3>
              {d.education.map((edu) => (
                <div key={edu.id} className="mb-3">
                  <p className="text-xs font-semibold text-white">{edu.degree}</p>
                  <p className="text-[10px] text-green-200">{edu.school}</p>
                  <p className="text-[10px] text-green-300">{edu.graduationDate}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Content */}
        <div className="flex-1 p-6 space-y-5">
          {/* Summary */}
          {d.summary && (
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h2 className="text-sm font-bold text-green-700 uppercase tracking-wide mb-2">About Me</h2>
              <p className="text-xs text-gray-700 leading-relaxed">{d.summary}</p>
            </div>
          )}

          {/* Experience */}
          {d.experience.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-green-700 uppercase tracking-wide mb-3">Work Experience</h2>
              <div className="space-y-3">
                {d.experience.map((exp) => (
                  <div key={exp.id} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-sm text-gray-900">{exp.title}</h3>
                        <p className="text-xs text-green-600">{exp.company}</p>
                      </div>
                      <span className="text-[10px] text-gray-500 bg-green-50 px-2 py-0.5 rounded">{exp.startDate} - {exp.endDate}</span>
                    </div>
                    {exp.bullets.length > 0 && (
                      <ul className="mt-2 text-xs text-gray-700 space-y-0.5 list-disc ml-4">
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
