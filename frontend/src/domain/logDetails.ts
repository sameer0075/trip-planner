/** Header and shipping fields of the paper log that the trip itself cannot derive. */
export interface LogDetails {
  carrierName: string
  mainOfficeAddress: string
  homeTerminalAddress: string
  vehicleNumbers: string
  shippingDocument: string
  shipperCommodity: string
}

export const EMPTY_LOG_DETAILS: LogDetails = {
  carrierName: '',
  mainOfficeAddress: '',
  homeTerminalAddress: '',
  vehicleNumbers: '',
  shippingDocument: '',
  shipperCommodity: '',
}

export const LOG_DETAIL_FIELDS: readonly {
  key: keyof LogDetails
  label: string
  placeholder: string
}[] = [
  { key: 'carrierName', label: 'Carrier name', placeholder: 'Acme Freight Lines' },
  {
    key: 'mainOfficeAddress',
    label: 'Main office address',
    placeholder: '100 Main St, Chicago, IL',
  },
  {
    key: 'homeTerminalAddress',
    label: 'Home terminal address',
    placeholder: '2400 Yard Rd, Joliet, IL',
  },
  {
    key: 'vehicleNumbers',
    label: 'Truck / trailer numbers',
    placeholder: 'Tractor 1042 / Trailer 5531',
  },
  {
    key: 'shippingDocument',
    label: 'Shipping document (DVL / manifest)',
    placeholder: 'BOL-208817',
  },
  {
    key: 'shipperCommodity',
    label: 'Shipper & commodity',
    placeholder: 'Midwest Foods — dry goods',
  },
]
