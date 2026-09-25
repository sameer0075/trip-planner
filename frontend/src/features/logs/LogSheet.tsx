import type { DailyLog } from '@/api/types'
import type { LogDetails } from '@/domain/logDetails'
import { formatDay } from '@/lib/time'

import { SHEET } from './geometry'
import { DutyGrid } from './sheet/DutyGrid'
import { PAPER } from './sheet/paper'
import { RecapSection } from './sheet/RecapSection'
import { RemarksSection } from './sheet/RemarksSection'
import { SheetHeader } from './sheet/SheetHeader'

interface LogSheetProps {
  log: DailyLog
  details: LogDetails
}

/** A filled-in Driver's Daily Log (Record of Duty Status), modelled on the FMCSA paper form. */
export function LogSheet({ log, details }: LogSheetProps) {
  return (
    <svg
      viewBox={`0 0 ${SHEET.width} ${SHEET.height}`}
      role="img"
      aria-label={`Driver's daily log for ${formatDay(log.date, 'long')}`}
      className="block h-auto w-full"
      fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
    >
      <rect width={SHEET.width} height={SHEET.height} fill={PAPER.background} />
      <SheetHeader log={log} details={details} />
      <DutyGrid log={log} />
      <RemarksSection remarks={log.remarks} details={details} />
      <RecapSection recap={log.recap} />
    </svg>
  )
}
