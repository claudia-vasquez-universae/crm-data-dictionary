#!/usr/bin/env node
/**
 * sync_blueprints_workflows.js
 * Fetches blueprints and workflow rules from Zoho.
 * Writes:
 *   docs/blueprints/index.json
 *   docs/workflows.json
 *   docs/workflows_detail/{id}.json  (one file per workflow)
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DOCS = join(__dirname, '..', 'docs')

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
    const data = await get(`${path}${path.includes('?') ? '&' : '?'}page=${page}&per_page=200`)
    const items = data[key] || []
    results.push(...items)
    if (!data.info?.more_records) break
    page++
  }
  return results
}

async function syncWorkflows() {
  console.log('Fetching workflow rules…')
  const workflows = await getAll('/settings/workflow_rules', 'workflow_rules')
  console.log(`  Found ${workflows.length} workflow rules`)

  const detailDir = join(DOCS, 'workflows_detail')
  mkdirSync(detailDir, { recursive: true })

  const summary = {
    workflows: [],
    total: workflows.length,
    active: workflows.filter(w => w.active).length,
    generated_at: new Date().toISOString(),
  }

  for (const wf of workflows) {
    summary.workflows.push({
      id: wf.id,
      name: wf.name,
      module: wf.module?.api_name || wf.module,
      active: wf.active,
      execute_when: wf.execute_when,
      actions_count: (wf.actions?.length ?? 0),
    })

    // Write detail file (actions + criteria, no sensitive data)
    try {
      const detail = await get(`/settings/workflow_rules/${wf.id}`)
      const rule = detail.workflow_rules?.[0] || detail
      const out = {
        id: wf.id,
        name: wf.name,
        criteria: rule.criteria ? {
          pattern: rule.criteria.pattern,
          conditions: (rule.criteria.conditions || []).map(c => ({
            field: { api_name: c.field?.api_name, display_label: c.field?.display_label },
            comparator: c.comparator,
            value: c.value,
          })),
        } : null,
        actions: {},
      }
      for (const [type, list] of Object.entries(rule.actions || {})) {
        if (Array.isArray(list)) {
          out.actions[type] = list.map(a => ({ name: a.name, type }))
        }
      }
      writeFileSync(join(detailDir, `${wf.id}.json`), JSON.stringify(out, null, 2))
    } catch (e) {
      console.warn(`  Could not fetch detail for ${wf.id}: ${e.message}`)
    }
  }

  writeFileSync(join(DOCS, 'workflows.json'), JSON.stringify(summary, null, 2))
  console.log(`  ✓ workflows.json written`)
}

async function syncBlueprints() {
  console.log('Fetching blueprints…')
  try {
    const data = await get('/settings/blueprints')
    const bps = data.blueprints || []
    const out = {
      blueprints: bps.map(bp => ({
        id: bp.id,
        name: bp.name,
        module: bp.module?.api_name || bp.module,
        transitions: bp.transitions?.length ?? 0,
      })),
      generated_at: new Date().toISOString(),
    }
    const bpDir = join(DOCS, 'blueprints')
    mkdirSync(bpDir, { recursive: true })
    writeFileSync(join(bpDir, 'index.json'), JSON.stringify(out, null, 2))
    console.log(`  ✓ blueprints/index.json: ${out.blueprints.length} blueprints`)
  } catch (e) {
    console.warn(`  Blueprints: ${e.message}`)
  }
}

async function main() {
  await syncWorkflows()
  await syncBlueprints()
}

main().catch(e => { console.error(e); process.exit(1) })
