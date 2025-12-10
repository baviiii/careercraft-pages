import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const CreativeTemplate3 = ({ data, isPreview = true }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-gradient-to-br from-violet-50 to-fuchsia-50 text-black ${isPreview ? 'scale-[0.35] origin-top-left w-[794px] min-h-[1123px]' : 'w-[794px] min-h-[1123px]'} p-8 shadow-none border-0 overflow-hidden`} style={{ boxSizing: 'border-box' }}>
      <div className="space-y-5">
        {/* Gradient Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl opacity-10"></div>
          <div className="relative p-5 text-center">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              {d.contact.name || "Your Name"}
            </h1>
            <div className="flex justify-center gap-3 mt-2 text-xs text-gray-600">
              {d.contact.email && <span>{d.contact.email}</span>}
              {d.contact.phone && <span>•</span>}
              {d.contact.phone && <span>{d.contact.phone}</span>}
              {d.contact.location && <span>•</span>}
              {d.contact.location && <span>{d.contact.location}</span>}
            </div>
          </div>
        </div>

        {/* Summary */}
        {d.summary && (
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-violet-100">
            <h2 className="text-xs font-bold text-violet-600 uppercase tracking-widest mb-2">✨ About Me</h2>
            <p className="text-xs text-gray-700 leading-relaxed">{d.summary}</p>
          </div>
        )}

        {/* Experience */}
        {d.experience.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-violet-600 uppercase tracking-widest mb-3">💼 Experience</h2>
            <div className="space-y-3">
              {d.experience.map((exp) => (
                <div key={exp.id} className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-violet-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">{exp.title}</h3>
                      <p className="text-xs text-fuchsia-600">{exp.company}</p>
                    </div>
                    <span className="text-[10px] text-gray-500 bg-violet-100 px-2 py-0.5 rounded-full">{exp.startDate} - {exp.endDate}</span>
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

        {/* Two columns */}
        <div className="grid grid-cols-2 gap-4">
          {d.education.length > 0 && (
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-violet-100">
              <h2 className="text-xs font-bold text-violet-600 uppercase tracking-widest mb-2">🎓 Education</h2>
              {d.education.map((edu) => (
                <div key={edu.id} className="mb-2">
                  <h3 className="font-bold text-xs text-gray-900">{edu.degree}</h3>
                  <p className="text-[10px] text-gray-600">{edu.school}</p>
                  <p className="text-[10px] text-fuchsia-500">{edu.graduationDate}</p>
                </div>
              ))}
            </div>
          )}

          {d.skills.length > 0 && (
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-violet-100">
              <h2 className="text-xs font-bold text-violet-600 uppercase tracking-widest mb-2">⚡ Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {d.skills.map((skill, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-violet-700 text-[10px] rounded-full">
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
