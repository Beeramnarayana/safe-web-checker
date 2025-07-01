import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UrlChecker } from "@/components/url-checker"
import { TextChecker } from "@/components/text-checker"
import { MediaChecker } from "@/components/media-checker"
import { DashboardHeader } from "@/components/dashboard-header"
import { RecentScans } from "@/components/recent-scans"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <DashboardHeader />

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Tabs defaultValue="url" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="url">URL Analysis</TabsTrigger>
                <TabsTrigger value="text">Text Analysis</TabsTrigger>
                <TabsTrigger value="media">Media Analysis</TabsTrigger>
              </TabsList>
              <TabsContent value="url" className="mt-4">
                <UrlChecker />
              </TabsContent>
              <TabsContent value="text" className="mt-4">
                <TextChecker />
              </TabsContent>
              <TabsContent value="media" className="mt-4">
                <MediaChecker />
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-1">
            <RecentScans />
          </div>
        </div>
      </div>
    </main>
  )
}

