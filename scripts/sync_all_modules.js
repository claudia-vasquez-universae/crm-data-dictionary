#!/usr/bin/env node
/**
 * sync_all_modules.js
 * Fetches all CRM modules from Zoho and writes:
 *   docs/modules/index.json           — module list with metadata
 *   docs/modules/{api_name}/fields.json — fields with profile permissions
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DOCS = join(__dirname, '..', 'docs', 'modules')
const ROOT = join(__dirname, '..')

const BASE_URL = 'https://www.zohoapis.eu/crm/v7'
const token = process.env.ZOHO_ACCESS_TOKEN
if (!token) { console.error('Missing ZOHO_ACCESS_TOKEN'); process.exit(1) }

const headers = { Authorization: `Zoho-oauthtoken ${token}` }

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers })
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json()
}

async function getAll(path, key) {
  const results = []
  let page = 1
  while (true) {
    const data = await get(`${path}?page=${page}&per_page=200`)
    const items = data[key] || []
    results.push(...items)
    if (!data.info?.more_records) break
    page++
  }
  return results
}

// Fields to keep per field (no sensitive data)
function pickField(f, profiles) {
  const out = {
    api_name: f.api_name,
    display_label: f.display_label,
    label: f.field_label,
    data_type: f.data_type,
    mandatory: f.system_mandatory || f.mandatory || false,
    custom: f.custom || false,
    bigdata: f.enable_colour_code !== undefined ? undefined : (f.webhook || false),
    created_time: f.created_time || null,
    section: f.section_name || null,
    description: f.tooltip?.name || null,
  }

  // bigdata flag (actually from a specific API field)
  if (typeof f.bigdata !== 'undefined') out.bigdata = f.bigdata
  else delete out.bigdata

  // Pick list values
  if (f.pick_list_values?.length) {
    out.pick_list_values = f.pick_list_values.map(v => ({ value: v.actual_value, label: v.display_value }))
  }

  // Profile permissions (no emails, no IDs)
  if (profiles?.length) {
    out.profiles = profiles.map(p => ({
      name: p.profile?.name ?? '',
      permission: p.permission ?? '',
    }))
  }

  return out
}

async function syncModule(mod) {
  const dir = join(DOCS, mod.api_name)
  mkdirSync(dir, { recursive: true })

  try {
    const data = await get(`/settings/fields?module=${mod.api_name}&include=allowed_permissions_to_update`)
    const raw = data.fields || []
    const fields = raw.map(f => pickField(f, f.allowed_permissions_to_update))
    writeFileSync(join(dir, 'fields.json'), JSON.stringify(fields, null, 2))
    console.log(`  ✓ ${mod.api_name}: ${fields.length} campos`)
    return { total: fields.length, bq: fields.filter(f => f.bigdata).length }
  } catch (e) {
    console.warn(`  ✗ ${mod.api_name}: ${e.message}`)
    return null
  }
}

async function main() {
  mkdirSync(DOCS, { recursive: true })

  console.log('Fetching modules…')
  const data = await get('/settings/modules')
  const mods = data.modules || []

  console.log(`Found ${mods.length} modules`)

  const index = { modules: [], generated_at: new Date().toISOString() }

  for (const mod of mods) {
    const result = await syncModule(mod)
    index.modules.push({
      api_name: mod.api_name,
      label: mod.plural_label || mod.singular_label || mod.api_name,
      level: mod.module_name === 'Leads' || ['Contacts', 'Accounts', 'Deals', 'Leads', 'Activities', 'Calls', 'Tasks', 'Events'].includes(mod.api_name) ? 'core' : 'custom',
      sync: true,
      last_synced: result ? new Date().toISOString() : null,
      total_fields: result?.total ?? 0,
      bq_fields: result?.bq ?? 0,
    })
  }

  writeFileSync(join(DOCS, 'index.json'), JSON.stringify(index, null, 2))
  console.log(`\nindex.json: ${index.modules.length} módulos`)
}

main().catch(e => { console.error(e); process.exit(1) })
