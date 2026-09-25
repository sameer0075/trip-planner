/** Element ids linking each tab to its panel (aria-controls / aria-labelledby). */
export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`
export const tabPanelId = (prefix: string, id: string) => `${prefix}-panel-${id}`
