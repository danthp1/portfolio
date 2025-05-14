import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import RichText from "@/components/RichText"

export const dynamic = 'force-static'
export const revalidate = 600

export default async function ResumePage() {
  return (
    <main className="container mx-auto py-12">
      <h1 className="text-4xl font-bold mb-8 text-center">Lebenslauf</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold mb-6 border-b pb-2">Beruflicher Werdegang</h2>
          <Suspense fallback={<ResumeSkeleton count={3} />}>
            <ProfessionalExperience />
          </Suspense>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6 border-b pb-2">Bildungswerdegang</h2>
          <Suspense fallback={<ResumeSkeleton count={2} />}>
            <Education />
          </Suspense>
        </div>
      </div>
    </main>
  )
}

async function ProfessionalExperience() {
  const payload = await getPayload({ config: configPromise })

  const { docs: experiences } = await payload.find({
    collection: 'resume',
    depth: 1,
    where: {
      type: {
        equals: 'professional',
      },
    },
    sort: '-startDate',
    overrideAccess: false,
  })

  if (!experiences || experiences.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground">Keine beruflichen Erfahrungen gefunden.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {experiences.map((experience) => (
        <ResumeEntry
          key={experience.id}
          title={experience.title}
          organization={experience.organization}
          location={experience.location}
          startDate={experience.startDate}
          endDate={experience.endDate}
          current={experience.current}
          content={experience.content}
          tags={experience.tags}
        />
      ))}
    </div>
  )
}

async function Education() {
  const payload = await getPayload({ config: configPromise })

  const { docs: educations } = await payload.find({
    collection: 'resume',
    depth: 1,
    where: {
      type: {
        equals: 'education',
      },
    },
    sort: '-startDate',
    overrideAccess: false,
  })

  if (!educations || educations.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground">Keine Bildungserfahrungen gefunden.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {educations.map((education) => (
        <ResumeEntry
          key={education.id}
          title={education.title}
          organization={education.organization}
          location={education.location}
          startDate={education.startDate}
          endDate={education.endDate}
          current={education.current}
          content={education.content}
          tags={education.tags}
        />
      ))}
    </div>
  )
}

function ResumeEntry({
  title,
  organization,
  location,
  startDate,
  endDate,
  current,
  content,
  tags
}) {
  // Format dates
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(date);
  };

  const startDateFormatted = formatDate(startDate);
  const endDateFormatted = current ? 'Aktuell' : formatDate(endDate);
  const dateRange = `${startDateFormatted} - ${endDateFormatted}`;

  return (
    <div className="border-l-2 border-blue-500 pl-4 py-2">
      <h3 className="text-xl font-semibold">{title}</h3>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-1">
        <p className="text-lg">{organization}</p>
        {location && <p className="text-muted-foreground">{location}</p>}
      </div>
      <p className="text-sm text-muted-foreground mt-1">{dateRange}</p>

      {content && (
        <div className="mt-3">
          <RichText data={content} enableGutter={false} />
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            >
              {tag.title}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ResumeSkeleton({ count = 3 }) {
  return (
    <div className="space-y-8">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border-l-2 border-gray-300 pl-4 py-2">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-5 w-1/2 mb-2" />
          <Skeleton className="h-4 w-1/3 mb-3" />
          <Skeleton className="h-20 w-full" />
        </div>
      ))}
    </div>
  )
}
