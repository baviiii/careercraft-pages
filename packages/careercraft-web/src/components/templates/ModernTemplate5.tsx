import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const ModernTemplate5 = ({ data }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-white text-black w-[794px] min-h-[1123px] shadow-none border-0 overflow-hidden`} style={{ boxSizing: 'border-box' }}>
      <div className="flex h-full">
        {/* Left Sidebar */}
        <div className="w-1/3 bg-gradient-to-b from-emerald-600 to-emerald-800 text-white p-6">
          <div className="mb-6">
            <h1 className="text-xl font-bold leading-tight">{d.contact.name || "Your Name"}</h1>
          </div>
          
          {/* Contact */}
          <div className="space-y-3 text-xs mb-6">
            <h3 className="text-emerald-200 uppercase text-[10px] tracking-widest font-semibold">Contact</h3>
            {d.contact.email && <p className="text-emerald-100">{d.contact.email}</p>}
            {d.contact.phone && <p className="text-emerald-100">{d.contact.phone}</p>}
            {d.contact.location && <p className="text-emerald-100">{d.contact.location}</p>}
            {d.contact.linkedin && <p className="text-emerald-100">{d.contact.linkedin}</p>}
          </div>

          {/* Skills */}
          {d.skills.length > 0 && (
            <div>
              <h3 className="text-emerald-200 uppercase text-[10px] tracking-widest font-semibold mb-2">Skills</h3>
              <div className="space-y-1.5">
                {d.skills.map((skill, idx) => (
                  <div key={idx} className="text-xs text-emerald-100 py-1 border-b border-emerald-500/30">
                    {skill}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {d.education.length > 0 && (
            <div className="mt-6">
              <h3 className="text-emerald-200 uppercase text-[10px] tracking-widest font-semibold mb-2">Education</h3>
              {d.education.map((edu) => (
                <div key={edu.id} className="mb-3">
                  <p className="text-xs font-semibold text-white">{edu.degree}</p>
                  <p className="text-[10px] text-emerald-200">{edu.school}</p>
                  <p className="text-[10px] text-emerald-300">{edu.graduationDate}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Content */}
        <div className="flex-1 p-6 space-y-5">
          {/* Summary */}
          {d.summary && (
            <div>
              <h2 className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-2">Profile</h2>
              <p className="text-xs text-gray-700 leading-relaxed">{d.summary}</p>
            </div>
          )}

          {/* Experience */}
          {d.experience.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-3">Experience</h2>
              <div className="space-y-4">
                {d.experience.map((exp) => (
                  <div key={exp.id} className="relative pl-4 border-l-2 border-emerald-200">
                    <div className="absolute -left-1.5 top-0 w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-sm text-gray-900">{exp.title}</h3>
                      <span className="text-[10px] text-emerald-600 font-medium">{exp.startDate} - {exp.endDate}</span>
                    </div>
                    <p className="text-xs text-gray-600">{exp.company}</p>
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
        </div>
      </div>
    </Card>
  );
};
