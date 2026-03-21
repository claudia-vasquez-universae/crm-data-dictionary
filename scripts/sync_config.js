#!/usr/bin/env node
/**
 * sync_config.js
 * Syncs CRM configuration (structure only, no sensitive data):
 *   docs/config/organization.json
 *   docs/config/profiles.json
 *   docs/config/roles.json
 *   docs/config/variables.json     (no values)
 *   docs/config/webhooks.json      (no URLs, no tokens)
 *   docs/config/assignment_rules.json
 *   docs/config/groups.json        (no user lists)
 *   docs/config/layouts/           (one file per module)
 *
 * IMPORTANT: This repo is public. Never store:
 *   - API keys, tokens, URLs of webhooks
 *   - Names/emails/IDs of people
 *   - Variable values (may contain IDs or tokens)
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONFIG = join(__dirname, '..', 'docs', 'config')

const BASE_URL = 'https://www.zohoapis.eu/crm/v7'
const token = process.env.ZOHO_ACCESS_TOKEN
if (!token) { console.error('Missing ZOHO_ACCESS_TOKEN'); process.exit(1) }

const headers = { Authorization: `Zoho-oauthtoken ${token}` }

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers })
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${await res.text().catch(() => '')}`)
  return res.json()
}

async function getAll(path, key) {
  const results = []
  let page = 1
  while (true) {
    const data = await get(`${path}${path.includes('?') ? '&' : '?'}page=${page}&per_page=200`)
    const items = data[key] || []
    results.push(...items)
    if (!data.info?.more_records) break
    page++
  }
  return results
}

function write(filename, data) {
  writeFileSync(join(CONFIG, filename), JSON.stringify(data, null, 2))
  console.log(`  ✓ ${filename}`)
}

// ── Organization ────────────────────────────────────────────────────────────
async function syncOrg() {
  try {
    const data = await get('/org')
    const org = (data.org || [])[0] || data
    write('organization.json', {
      name: org.company_name,
      alias: org.alias,
      country: org.country,
      time_zone: org.time_zone,
      currency: org.currency_symbol,
      generated_at: new Date().toISOString(),
    })
  } catch (e) { console.warn(`  org: ${e.message}`) }
}

// ── Profiles ────────────────────────────────────────────────────────────────
async function syncProfiles() {
  try {
    const data = await get('/settings/profiles')
    const profiles = data.profiles || []
    write('profiles.json', {
      profiles: profiles.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || null,
        default: p.default || false,
        created_time: p.created_time || null,
        modified_time: p.modified_time || null,
      })),
      total: profiles.length,
      generated_at: new Date().toISOString(),
    })
  } catch (e) { console.warn(`  profiles: ${e.message}`) }
}

// ── Roles ───────────────────────────────────────────────────────────────────
async function syncRoles() {
  try {
    const data = await get('/settings/roles')
    const roles = data.roles || []
    write('roles.json', {
      roles: roles.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description || null,
        reporting_to: r.reporting_to?.name || null,
        share_with_peers: r.share_with_peers || false,
        created_time: r.created_time || null,
      })),
      total: roles.length,
      generated_at: new Date().toISOString(),
    })
  } catch (e) { console.warn(`  roles: ${e.message}`) }
}

// ── Variables ───────────────────────────────────────────────────────────────
// No values — may contain IDs or tokens (repo is public)
async function syncVariables() {
  try {
    const data = await get('/settings/variables')
    const vars = data.variables || []
    write('variables.json', {
      variables: vars.map(v => ({
        id: v.id,
        name: v.name,
        api_name: v.api_name,
        type: v.type,
        description: v.description || null,
        // NOTE: value intentionally omitted — may contain sensitive data
      })),
      total: vars.length,
      generated_at: new Date().toISOString(),
    })
  } catch (e) { console.warn(`  variables: ${e.message}`) }
}

// ── Webhooks ────────────────────────────────────────────────────────────────
// No URLs, no tokens (repo is public)
async function syncWebhooks() {
  try {
    const webhooks = await getAll('/actions/webhooks', 'webhooks')
    write('webhooks.json', {
      webhooks: webhooks.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description || null,
        method: w.method,
        // url intentionally omitted — contains tokens/secrets
        associated_modules: w.associated_modules?.map(m => m.api_name || m) || [],
        active: w.active ?? true,
        created_time: w.created_time || null,
        modified_time: w.modified_time || null,
      })),
      total: webhooks.length,
      generated_at: new Date().toISOString(),
    })
  } catch (e) { console.warn(`  webhooks: ${e.message}`) }
}

// ── Assignment Rules ─────────────────────────────────────────────────────────
async function syncAssignmentRules() {
  try {
    const rules = await getAll('/settings/assignment_rules', 'assignment_rules')
    write('assignment_rules.json', {
      assignment_rules: rules.map(r => ({
        id: r.id,
        name: r.name,
        module: r.module?.api_name || r.module,
        description: r.description || null,
        active: r.active ?? true,
        created_time: r.created_time || null,
        modified_time: r.modified_time || null,
      })),
      total: rules.length,
      generated_at: new Date().toISOString(),
    })
  } catch (e) { console.warn(`  assignment_rules: ${e.message}`) }
}

// ── Groups ──────────────────────────────────────────────────────────────────
// Names only, no user lists (repo is public)
async function syncGroups() {
  try {
    const data = await get('/settings/groups')
    const groups = data.groups || []
    write('groups.json', {
      groups: groups.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description || null,
        type: g.type || null,
        // users intentionally omitted — contains personal data
      })),
      total: groups.length,
      generated_at: new Date().toISOString(),
    })
  } catch (e) { console.warn(`  groups: ${e.message}`) }
}

// ── Layouts ──────────────────────────────────────────────────────────────────
async function syncLayouts() {
  try {
    const modsData = await get('/settings/modules')
    const mods = modsData.modules || []
    const layoutDir = join(CONFIG, 'layouts')
    mkdirSync(layoutDir, { recursive: true })

    for (const mod of mods) {
      try {
        const data = await get(`/settings/layouts?module=${mod.api_name}`)
        const layouts = data.layouts || []
        const out = layouts.map(l => ({
          id: l.id,
          name: l.name,
          sections: (l.sections || []).map(s => ({
            name: s.name,
            fields: (s.fields || []).map(f => ({
              api_name: f.api_name,
              label: f.display_label || f.field_label,
              sequence: f.sequence_number,
            })),
          })),
        }))
        writeFileSync(join(layoutDir, `${mod.api_name}.json`), JSON.stringify(out, null, 2))
        console.log(`  ✓ layouts/${mod.api_name}.json`)
      } catch (e) {
        console.warn(`  layouts/${mod.api_name}: ${e.message}`)
      }
    }
  } catch (e) { console.warn(`  layouts: ${e.message}`) }
}

async function main() {
  mkdirSync(CONFIG, { recursive: true })
  console.log('Syncing CRM config…')

  await syncOrg()
  await syncProfiles()
  await syncRoles()
  await syncVariables()
  await syncWebhooks()
  await syncAssignmentRules()
  await syncGroups()
  await syncLayouts()

  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
