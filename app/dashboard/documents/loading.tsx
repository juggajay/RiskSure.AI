import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function DocumentsLoading() {
  return (
    <>
      {/* Header Skeleton */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-36 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6 md:p-8 lg:p-12 space-y-6">
        {/* Search */}
        <Skeleton className="h-10 w-80 max-w-md" />

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <Skeleton className="h-4 w-28 mb-2" />
                    <Skeleton className="h-8 w-12" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Documents List Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-3 w-2" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
