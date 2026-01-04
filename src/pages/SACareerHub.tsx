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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full max-w-md mx-auto mb-6 bg-slate-900/50 border border-slate-800/50 p-1 rounded-2xl">
          <TabsTrigger 
            value="explore" 
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-teal-500 data-[state=active]:text-white"
          >
            <Globe className="w-4 h-4" />
            Explore SA
          </TabsTrigger>
          <TabsTrigger 
            value="coach" 
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
          >
            <Brain className="w-4 h-4" />
            Horus Chat
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
