import type { DailyLog } from '@/api/types'
import type { LogDetails } from '@/domain/logDetails'

import { LogSheet } from './LogSheet'

/** Every sheet, one per page; only rendered by the browser's print layout. */
export function PrintableLogs({
  logs,
  details,
}: {
  logs: readonly DailyLog[]
  details: LogDetails
}) {
  return (
    <div className="hidden print:block">
      {logs.map((log) => (
        <div key={log.date} className="break-after-page last:break-after-auto">
          <LogSheet log={log} details={details} />
        </div>
      ))}
    </div>
  )
}
