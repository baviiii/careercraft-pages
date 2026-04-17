import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const ProfessionalTemplate6 = ({ data, isPreview = true }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-white text-black ${isPreview ? 'scale-[0.35] origin-top-left w-[794px] min-h-[1123px]' : 'w-[794px] min-h-[1123px]'} p-8 shadow-none border-0 overflow-hidden`} style={{ boxSizing: 'border-box' }}>
      <div className="space-y-5">
        {/* Monogram Style Header */}
        <div className="flex items-start gap-4 pb-4 border-b border-gray-300">
          <div className="w-14 h-14 bg-gray-900 text-white flex items-center justify-center text-xl font-bold rounded">
            {(d.contact.name || "YN").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{d.contact.name || "Your Name"}</h1>
            <p className="text-xs text-gray-600 mt-1">
              {[d.contact.email, d.contact.phone, d.contact.location].filter(Boolean).join(" • ")}
            </p>
          </div>
        </div>

        {/* Summary */}
        {d.summary && (
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Professional Summary</h2>
            <p className="text-xs text-gray-700 leading-relaxed">{d.summary}</p>
          </div>
        )}

        {/* Experience */}
        {d.experience.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Career History</h2>
            <div className="space-y-3">
              {d.experience.map((exp, index) => (
                <div key={exp.id} className="relative">
                  <div className="flex gap-4">
                    <div className="w-6 text-center">
                      <span className="inline-block w-6 h-6 bg-gray-900 text-white text-[10px] font-bold rounded-full leading-6">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-bold text-sm text-gray-900">{exp.title}</h3>
                        <span className="text-[10px] text-gray-500">{exp.startDate} - {exp.endDate}</span>
                      </div>
                      <p className="text-xs text-gray-600">{exp.company}{exp.location ? `, ${exp.location}` : ""}</p>
                      {exp.bullets.length > 0 && (
                        <ul className="mt-1.5 text-xs text-gray-700 space-y-0.5 list-disc ml-4">
                          {exp.bullets.filter(b => b.trim()).map((bullet, idx) => (
                            <li key={idx}>{bullet}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education & Skills */}
        <div className="grid grid-cols-2 gap-6 pt-2">
          {d.education.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Education</h2>
              {d.education.map((edu) => (
                <div key={edu.id} className="mb-2">
                  <h3 className="font-bold text-xs text-gray-900">{edu.degree}</h3>
                  <p className="text-[10px] text-gray-600">{edu.school}</p>
                  <p className="text-[10px] text-gray-500">{edu.graduationDate}</p>
                </div>
              ))}
            </div>
          )}

          {d.skills.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Technical Skills</h2>
              <p className="text-xs text-gray-700 leading-relaxed">{d.skills.join(" · ")}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
