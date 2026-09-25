import { FileText, ListOrdered, Signpost } from 'lucide-react'
import { useState } from 'react'

import type { TripPlan } from '@/api/types'
import { Card } from '@/components/ui/Card'
import { tabId, tabPanelId } from '@/components/ui/tabIds'
import { Tabs, type TabItem } from '@/components/ui/Tabs'
import type { LogDetails } from '@/domain/logDetails'
import { Directions } from '@/features/directions/Directions'
import { Itinerary } from '@/features/itinerary/Itinerary'
import { LogsPanel } from '@/features/logs/LogsPanel'

import { TripSummary } from './TripSummary'

type ResultTab = 'logs' | 'itinerary' | 'directions'
const TAB_PREFIX = 'results'

interface TripResultsProps {
  plan: TripPlan
  logDetails: LogDetails
}

export function TripResults({ plan, logDetails }: TripResultsProps) {
  const [tab, setTab] = useState<ResultTab>('logs')
  const tabs: readonly TabItem<ResultTab>[] = [
    { id: 'logs', label: 'Daily logs', icon: FileText, badge: plan.logs.length },
    { id: 'itinerary', label: 'Itinerary', icon: ListOrdered, badge: plan.events.length },
    { id: 'directions', label: 'Directions', icon: Signpost },
  ]

  return (
    <div className="space-y-5">
      <TripSummary summary={plan.summary} />
      <Card className="p-4 sm:p-5">
        <Tabs
          tabs={tabs}
          value={tab}
          onChange={setTab}
          label="Trip details"
          idPrefix={TAB_PREFIX}
        />
        <div
          role="tabpanel"
          id={tabPanelId(TAB_PREFIX, tab)}
          aria-labelledby={tabId(TAB_PREFIX, tab)}
          className="mt-5"
        >
          {tab === 'logs' && <LogsPanel logs={plan.logs} details={logDetails} />}
          {tab === 'itinerary' && <Itinerary events={plan.events} />}
          {tab === 'directions' && <Directions legs={plan.route.legs} />}
        </div>
      </Card>
    </div>
  )
}
