export function resultRange(page, pageSize, total) {
  if (total <= 0) return [0, 0]
  return [Math.min((page - 1) * pageSize + 1, total), Math.min(page * pageSize, total)]
}

export function pageNumbers(page, pages) {
  return [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((number) => number > 0 && number <= pages).sort((a, b) => a - b)
}

export function inventoryValue(asset) {
  return asset.purchase_cost ?? null
}

export function humanizeActivity(item) {
  const messages = { first_admin_provisioned: 'Created the first administrator account.', operator_password_reset: 'Reset an account password.', login_failed: 'Unsuccessful sign-in attempt.', login: 'Signed in.', logout: 'Signed out.' }
  if (messages[item.action]) return messages[item.action]
  return item.detail || `${String(item.action || 'Updated').replaceAll('_', ' ')} ${String(item.entity_type || 'record').replaceAll('_', ' ')}${item.entity_id ? ` #${item.entity_id}` : ''}`
}
