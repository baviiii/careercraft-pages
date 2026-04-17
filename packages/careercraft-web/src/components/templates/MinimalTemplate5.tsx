import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const MinimalTemplate5 = ({ data, isPreview = true }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-neutral-50 text-black ${isPreview ? 'scale-[0.35] origin-top-left w-[794px] min-h-[1123px]' : 'w-[794px] min-h-[1123px]'} p-8 shadow-none border-0 overflow-hidden`} style={{ boxSizing: 'border-box' }}>
      <div className="space-y-5">
        {/* Swiss Style Header */}
        <div className="grid grid-cols-3 gap-4 pb-4 border-b-2 border-black">
          <div className="col-span-2">
            <h1 className="text-3xl font-black text-gray-900 leading-none">{d.contact.name || "Your Name"}</h1>
          </div>
          <div className="text-right text-[10px] text-gray-600 space-y-0.5">
            <p>{d.contact.email}</p>
            <p>{d.contact.phone}</p>
            <p>{d.contact.location}</p>
          </div>
        </div>

        {/* Summary */}
        {d.summary && (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-[9px] font-medium text-gray-500 uppercase tracking-widest pt-0.5">Profile</div>
            <p className="col-span-2 text-xs text-gray-700 leading-relaxed">{d.summary}</p>
          </div>
        )}

        {/* Experience */}
        {d.experience.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-[9px] font-medium text-gray-500 uppercase tracking-widest pt-0.5">Experience</div>
            <div className="col-span-2 space-y-4">
              {d.experience.map((exp) => (
                <div key={exp.id}>
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-bold text-sm text-gray-900">{exp.title}</h3>
                    <span className="text-[9px] text-gray-500">{exp.startDate}—{exp.endDate}</span>
                  </div>
                  <p className="text-[10px] text-gray-600">{exp.company}</p>
                  {exp.bullets.length > 0 && (
                    <ul className="mt-1.5 text-[10px] text-gray-600 space-y-0.5 list-disc ml-3">
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
          <div className="grid grid-cols-3 gap-4">
            <div className="text-[9px] font-medium text-gray-500 uppercase tracking-widest pt-0.5">Education</div>
            <div className="col-span-2">
              {d.education.map((edu) => (
                <div key={edu.id} className="flex justify-between items-baseline mb-1">
                  <div>
                    <span className="text-xs font-medium text-gray-900">{edu.degree}</span>
                    <span className="text-[10px] text-gray-500"> — {edu.school}</span>
                  </div>
                  <span className="text-[9px] text-gray-500">{edu.graduationDate}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {d.skills.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-[9px] font-medium text-gray-500 uppercase tracking-widest pt-0.5">Skills</div>
            <p className="col-span-2 text-[10px] text-gray-700">{d.skills.join(", ")}</p>
          </div>
        )}
      </div>
    </Card>
  );
};
