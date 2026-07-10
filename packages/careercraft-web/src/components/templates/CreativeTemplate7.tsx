import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const CreativeTemplate7 = ({ data }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-white text-black w-[794px] min-h-[1123px] shadow-none border-0 overflow-hidden`} style={{ boxSizing: 'border-box' }}>
      {/* Geometric Header */}
      <div className="relative h-24 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-black text-white tracking-wide drop-shadow-lg">
              {d.contact.name?.toUpperCase() || "YOUR NAME"}
            </h1>
            <div className="flex justify-center gap-3 mt-1 text-xs text-white/90">
              {d.contact.email && <span>{d.contact.email}</span>}
              {d.contact.phone && <span>|</span>}
              {d.contact.phone && <span>{d.contact.phone}</span>}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-white" style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 0 100%)' }}></div>
      </div>

      <div className="p-8 pt-4 space-y-5">
        {/* Summary */}
        {d.summary && (
          <div className="relative">
            <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-pink-500 to-yellow-500 rounded"></div>
            <div className="pl-4">
              <h2 className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-1">Profile</h2>
              <p className="text-xs text-gray-700 leading-relaxed">{d.summary}</p>
            </div>
          </div>
        )}

        {/* Experience */}
        {d.experience.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-gradient-to-r from-pink-500 to-yellow-500"></span>
              Experience
            </h2>
            <div className="space-y-3">
              {d.experience.map((exp) => (
                <div key={exp.id} className="bg-gradient-to-r from-pink-50 to-yellow-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">{exp.title}</h3>
                      <p className="text-xs text-red-600 font-medium">{exp.company}</p>
                    </div>
                    <span className="text-[10px] text-gray-500">{exp.startDate} - {exp.endDate}</span>
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
            <div className="bg-gradient-to-br from-pink-50 to-red-50 rounded-lg p-4">
              <h2 className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-2">Education</h2>
              {d.education.map((edu) => (
                <div key={edu.id} className="mb-2">
                  <h3 className="font-bold text-xs text-gray-900">{edu.degree}</h3>
                  <p className="text-[10px] text-gray-600">{edu.school}</p>
                  <p className="text-[10px] text-red-500">{edu.graduationDate}</p>
                </div>
              ))}
            </div>
          )}

          {d.skills.length > 0 && (
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4">
              <h2 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-2">Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {d.skills.map((skill, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-white text-orange-700 text-[10px] rounded shadow-sm border border-orange-200">
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
