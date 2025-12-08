import { Card } from "@/components/ui/card";
import { TemplateProps, defaultTemplateData } from "./types";

export const CreativeTemplate1 = ({ data, isPreview = true }: TemplateProps) => {
  const d = data || defaultTemplateData;
  
  return (
    <Card className={`bg-gradient-to-br from-purple-50 via-white to-pink-50 text-black ${isPreview ? 'scale-[0.4] origin-top-left w-[210mm] h-[297mm]' : 'w-full'} p-8 shadow-none border-2 border-border`}>
      <div className="space-y-6">
        {/* Bold Asymmetric Header */}
        <div className="relative">
          <div className="absolute -left-8 top-0 w-2 h-24 bg-gradient-to-b from-purple-600 to-pink-600"></div>
          <div className="pl-4">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
              {d.contact.name?.toUpperCase() || "YOUR NAME"}
            </h1>
            <p className="text-sm font-bold text-purple-800">{d.experience[0]?.title || "Professional Title"}</p>
            <p className="text-xs text-gray-600 mt-1">
              {[d.contact.email, d.contact.phone, d.contact.location].filter(Boolean).join(" • ")}
            </p>
          </div>
        </div>

        {/* Dynamic Grid Layout */}
        <div className="grid grid-cols-5 gap-4">
          {/* Left Column - Skills */}
          <div className="col-span-2 space-y-4">
            {d.skills.length > 0 && (
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-4 rounded-lg">
                <h2 className="text-sm font-black text-purple-900 uppercase mb-3">Skills</h2>
                <div className="space-y-2">
                  {d.skills.slice(0, 5).map((skill, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-purple-800">{skill}</span>
                      </div>
                      <div className="h-1.5 bg-purple-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-600 to-pink-600" style={{ width: `${90 - idx * 10}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {d.education.length > 0 && (
              <div className="bg-gradient-to-br from-pink-100 to-purple-100 p-4 rounded-lg">
                <h2 className="text-sm font-black text-purple-900 uppercase mb-2">Education</h2>
                {d.education.map((edu) => (
                  <div key={edu.id} className="text-xs mb-2">
                    <p className="font-bold text-purple-800">{edu.degree}</p>
                    <p className="text-gray-700">{edu.school}</p>
                    <p className="text-purple-600 font-semibold">{edu.graduationDate}{edu.gpa ? ` • GPA ${edu.gpa}` : ""}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Experience */}
          <div className="col-span-3 space-y-4">
            {d.experience.length > 0 && (
              <div>
                <h2 className="text-sm font-black text-purple-900 uppercase mb-3 pb-2 border-b-2 border-purple-300">Experience</h2>
                <div className="space-y-4">
                  {d.experience.map((exp) => (
                    <div key={exp.id} className="relative pl-6">
                      <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-gradient-to-br from-purple-600 to-pink-600"></div>
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-black text-sm text-purple-900">{exp.title}</h3>
                        <span className="text-xs font-bold text-purple-600">{exp.startDate} - {exp.endDate}</span>
                      </div>
                      <p className="text-xs font-bold text-purple-700 mb-2">{exp.company}</p>
                      {exp.bullets.length > 0 && (
                        <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
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
      </div>
    </Card>
  );
};
