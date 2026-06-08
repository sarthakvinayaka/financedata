// WarnTimeline — chronological list of WARN Act notices for a company.
// Server Component.

interface WarnNotice {
  id: string
  employerName: string
  noticeDate: Date
  layoffDate: Date | null
  affectedWorkers: number
  noticeType: string
  isTemporary: boolean
  state: string
  city: string | null
  sourceUrl: string | null
}

const NOTICE_TYPE_LABELS: Record<string, string> = {
  LAYOFF: 'Mass Layoff',
  PLANT_CLOSING: 'Plant Closing',
  RELOCATION: 'Relocation',
}

interface WarnTimelineProps {
  notices: WarnNotice[]
}

export function WarnTimeline({ notices }: WarnTimelineProps) {
  return (
    <div className="divide-y divide-gray-100">
      {notices.map((notice) => (
        <div key={notice.id} className="px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {NOTICE_TYPE_LABELS[notice.noticeType] ?? notice.noticeType}
                </span>
                {notice.isTemporary && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                    Temporary
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                {[notice.city, notice.state].filter(Boolean).join(', ')}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">
                {notice.affectedWorkers.toLocaleString()} workers
              </p>
              <p className="text-xs text-gray-400">affected</p>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
            <span>
              Notice filed:{' '}
              <span className="font-medium text-gray-700">
                {new Date(notice.noticeDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </span>
            {notice.layoffDate && (
              <span>
                Effective:{' '}
                <span className="font-medium text-gray-700">
                  {new Date(notice.layoffDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </span>
            )}
            {notice.sourceUrl && (
              <a
                href={notice.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Source ↗
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
