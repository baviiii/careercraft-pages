import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const CreativeTemplate5 = ({ data }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-gradient-to-br from-cyan-900 via-blue-900 to-indigo-900 text-white w-[794px] min-h-[1123px] p-8 shadow-none border-0 overflow-hidden`} style={{ boxSizing: 'border-box' }}>
      <div className="space-y-5">
        {/* Neon Header */}
        <div className="text-center pb-4 border-b border-cyan-500/30">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
            {d.contact.name || "Your Name"}
          </h1>
          <div className="flex justify-center gap-4 mt-2 text-xs text-cyan-300">
            {d.contact.email && <span>{d.contact.email}</span>}
            {d.contact.phone && <span>{d.contact.phone}</span>}
            {d.contact.location && <span>{d.contact.location}</span>}
          </div>
        </div>

        {/* Summary */}
        {d.summary && (
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-cyan-500/20">
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2">Profile</h2>
            <p className="text-xs text-gray-300 leading-relaxed">{d.summary}</p>
          </div>
        )}

        {/* Experience */}
        {d.experience.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">Experience</h2>
            <div className="space-y-3">
              {d.experience.map((exp) => (
                <div key={exp.id} className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-cyan-500/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm text-white">{exp.title}</h3>
                      <p className="text-xs text-cyan-400">{exp.company}</p>
                    </div>
                    <span className="text-[10px] text-blue-300">{exp.startDate} - {exp.endDate}</span>
                  </div>
                  {exp.bullets.length > 0 && (
                    <ul className="mt-2 text-xs text-gray-300 space-y-0.5 list-disc ml-4">
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

        {/* Two columns */}
        <div className="grid grid-cols-2 gap-4">
          {d.education.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-cyan-500/20">
              <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2">Education</h2>
              {d.education.map((edu) => (
                <div key={edu.id} className="mb-2">
                  <h3 className="font-bold text-xs text-white">{edu.degree}</h3>
                  <p className="text-[10px] text-gray-400">{edu.school}</p>
                  <p className="text-[10px] text-cyan-500">{edu.graduationDate}</p>
                </div>
              ))}
            </div>
          )}

          {d.skills.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-cyan-500/20">
              <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2">Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {d.skills.map((skill, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-[10px] rounded border border-cyan-500/30">
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
