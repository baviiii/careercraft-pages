import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Brain } from "lucide-react";
import ExploreSA from "@/components/rag/ExploreSA";
import CareerCoach from "@/components/rag/CareerCoach";
import { UnifiedLayout } from "@/components/layout/UnifiedLayout";

export default function SACareerHub() {
  const [activeTab, setActiveTab] = useState("explore");

  return (
    <UnifiedLayout
      title="Career Hub"
      subtitle="Your gateway to career opportunities"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full px-4">
        <TabsList className="w-full max-w-md mx-auto mb-4 sm:mb-6 bg-slate-900/50 border border-slate-800/50 p-1 rounded-2xl">
          <TabsTrigger
            value="explore"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-teal-500 data-[state=active]:text-white text-sm sm:text-base"
          >
            <Globe className="w-4 h-4" />
            <span className="hidden xs:inline">Explore SA</span>
            <span className="xs:hidden">Explore</span>
          </TabsTrigger>
          <TabsTrigger
            value="coach"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white text-sm sm:text-base"
          >
            <Brain className="w-4 h-4" />
            <span className="hidden xs:inline">Horus Chat</span>
            <span className="xs:hidden">Chat</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="explore" className="mt-0">
          <ExploreSA />
        </TabsContent>

        <TabsContent value="coach" className="mt-0">
          <CareerCoach />
        </TabsContent>
      </Tabs>
    </UnifiedLayout>
  );
}
