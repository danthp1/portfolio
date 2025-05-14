import React from 'react'
import Link from 'next/link'

type ResumeEntry = {
  id: string
  title: string
  organization: string
  type: 'professional' | 'education'
  startDate: string
  endDate?: string
  current?: boolean
}

type RelatedExperienceProps = {
  experiences: ResumeEntry[]
}

const RelatedExperience: React.FC<RelatedExperienceProps> = ({ experiences }) => {
  if (!experiences || experiences.length === 0) {
    return null
  }

  // Format dates
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(date);
  };

  return (
    <div className="mt-12 border-t pt-8">
      <h2 className="text-2xl font-bold mb-6">Relevante Erfahrung</h2>
      <div className="space-y-4">
        {experiences.map((experience) => {
          const startDateFormatted = formatDate(experience.startDate);
          const endDateFormatted = experience.current ? 'Aktuell' : formatDate(experience.endDate);
          const dateRange = `${startDateFormatted} - ${endDateFormatted}`;

          return (
            <div key={experience.id} className="border-l-2 border-blue-500 pl-4 py-2">
              <h3 className="text-xl font-semibold">{experience.title}</h3>
              <p className="text-lg">{experience.organization}</p>
              <p className="text-sm text-muted-foreground">{dateRange}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {experience.type === 'professional' ? 'Berufliche Erfahrung' : 'Bildung'}
              </p>
              <Link href="/resume" className="text-blue-500 hover:underline text-sm mt-2 inline-block">
                Mehr im Lebenslauf anzeigen
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default RelatedExperience
