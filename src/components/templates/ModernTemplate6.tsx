import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const ModernTemplate6 = ({ data, isPreview = true }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-white text-black ${isPreview ? 'scale-[0.4] origin-top-left w-[210mm] h-[297mm]' : 'w-full'} p-8 shadow-none border-2 border-border`}>
      <div className="space-y-5">
        {/* Centered Header with Dots */}
        <div className="text-center pb-4">
          <h1 className="text-3xl font-light text-gray-900 tracking-wide">{d.contact.name || "Your Name"}</h1>
          <div className="flex justify-center items-center gap-2 mt-2 text-xs text-gray-600">
            {d.contact.email && <span>{d.contact.email}</span>}
            {d.contact.email && d.contact.phone && <span className="text-rose-400">●</span>}
            {d.contact.phone && <span>{d.contact.phone}</span>}
            {d.contact.phone && d.contact.location && <span className="text-rose-400">●</span>}
            {d.contact.location && <span>{d.contact.location}</span>}
          </div>
          <div className="flex justify-center gap-1 mt-3">
            <span className="w-12 h-0.5 bg-rose-400"></span>
            <span className="w-3 h-0.5 bg-rose-200"></span>
          </div>
        </div>

        {/* Summary */}
        {d.summary && (
          <div>
            <h2 className="text-xs font-bold text-rose-500 uppercase tracking-[0.2em] mb-2 text-center">Summary</h2>
            <p className="text-xs text-gray-700 leading-relaxed text-center max-w-lg mx-auto">{d.summary}</p>
          </div>
        )}

        {/* Experience */}
        {d.experience.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-rose-500 uppercase tracking-[0.2em] mb-3 text-center">Experience</h2>
            <div className="space-y-4">
              {d.experience.map((exp) => (
                <div key={exp.id} className="text-center">
                  <h3 className="font-bold text-sm text-gray-900">{exp.title}</h3>
                  <p className="text-xs text-rose-500 font-medium">{exp.company}</p>
                  <p className="text-[10px] text-gray-500">{exp.location} | {exp.startDate} - {exp.endDate}</p>
                  {exp.bullets.length > 0 && (
                    <ul className="mt-2 text-xs text-gray-700 space-y-0.5 text-left max-w-md mx-auto list-disc ml-4">
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
        <div className="grid grid-cols-2 gap-8">
          {/* Education */}
          {d.education.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-rose-500 uppercase tracking-[0.2em] mb-2 text-center">Education</h2>
              {d.education.map((edu) => (
                <div key={edu.id} className="text-center mb-2">
                  <h3 className="font-bold text-xs text-gray-900">{edu.degree}</h3>
                  <p className="text-[10px] text-gray-600">{edu.school}</p>
                  <p className="text-[10px] text-gray-500">{edu.graduationDate}</p>
                </div>
              ))}
            </div>
          )}

          {/* Skills */}
          {d.skills.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-rose-500 uppercase tracking-[0.2em] mb-2 text-center">Skills</h2>
              <div className="flex flex-wrap justify-center gap-1.5">
                {d.skills.map((skill, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] rounded">
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
