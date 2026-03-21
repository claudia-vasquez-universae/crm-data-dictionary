# CLAUDE.md — crm-data-dictionary

Copia de seguridad de los archivos clave del repo. Actualizar siempre que se modifiquen.

## Stack

- **Frontend**: Vite 6 + React 19, servido desde `dist/` o en dev con `npm run dev`
- **Base path**: `/crm-data-dictionary/`
- **Scripts**: Node.js ESM (`"type": "module"`)
- **Datos**: `docs/` — JSONs generados por los scripts de sync

## Estructura

```
src/
  main.jsx                          ← entry point
  App.jsx                           ← routing entre secciones
  PendingContext.jsx                 ← cambios BQ pendientes
  github.js                         ← GitHub API (PAT, read/write fields)
  styles/main.css
  hooks/useNavHeight.js              ← ResizeObserver sobre #main-header
  sections/react/
    Header.jsx
    ModuleList.jsx
    AllFields.jsx
    Functions.jsx
    Workflows.jsx
    Processes.jsx
    Blueprints.jsx
    ModuleDetail/index.jsx           ← lazy loaded

scripts/
  sync_all_modules.js               ← módulos + campos + permisos de perfil
  sync_blueprints_workflows.js      ← workflows + blueprints
  sync_config.js                    ← org, profiles, roles, variables, webhooks,
                                       assignment_rules, groups, layouts

docs/
  modules/index.json
  modules/{api_name}/fields.json
  workflows.json
  workflows_detail/{id}.json
  blueprints/index.json
  functions_index.json
  field_stats.json
  config/
    organization.json
    profiles.json
    roles.json
    variables.json    ← sin valores (pueden contener IDs sensibles)
    webhooks.json     ← sin URLs ni tokens
    assignment_rules.json
    groups.json       ← sin usuarios
    layouts/{module}.json
  manual-usuario/
    index.json
    *.md
```

## GitHub Actions: monitor.yml

```yaml
name: Monitor Zoho CRM Fields — All Modules
on:
  schedule:
    - cron: '0 7 * * 2-6'   # Martes a sábado, 7:00 UTC
  workflow_dispatch:
    inputs:
      scope:
        description: 'Qué sincronizar'
        required: false
        default: 'all'
        type: choice
        options: [all, fields, workflows, config]

permissions:
  contents: write

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: main

      - uses: actions/setup-node@v4
        with:
          node-version: '24'

      - name: Install dependencies
        run: npm ci

      - name: Refresh Zoho OAuth token
        run: |
          RESPONSE=$(curl -s -X POST "https://accounts.zoho.eu/oauth/v2/token" \
            -d "refresh_token=${{ secrets.ZOHO_REFRESH_TOKEN }}" \
            -d "client_id=${{ secrets.ZOHO_CLIENT_ID }}" \
            -d "client_secret=${{ secrets.ZOHO_CLIENT_SECRET }}" \
            -d "grant_type=refresh_token")
          echo "ZOHO_ACCESS_TOKEN=$(echo $RESPONSE | python3 -c 'import sys,json;print(json.load(sys.stdin)[\"access_token\"])')" >> $GITHUB_ENV

      - name: Sync all modules and fields
        if: ${{ github.event.inputs.scope == 'all' || github.event.inputs.scope == 'fields' || github.event.inputs.scope == '' }}
        run: node scripts/sync_all_modules.js

      - name: Sync workflows and blueprints
        if: ${{ github.event.inputs.scope == 'all' || github.event.inputs.scope == 'workflows' || github.event.inputs.scope == '' }}
        run: node scripts/sync_blueprints_workflows.js

      - name: Sync CRM config
        if: ${{ github.event.inputs.scope == 'all' || github.event.inputs.scope == 'config' || github.event.inputs.scope == '' }}
        run: node scripts/sync_config.js

      - name: Commit and push if changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add docs/
          if git diff --cached --quiet; then
            echo "No changes to commit"
          else
            git commit -m "chore(sync): actualizar campos y workflows — $(date '+%d/%m/%Y')"
            git push origin main
          fi

      - name: Notificar fallo a Zoho Desk
        if: failure()
        uses: dawidd6/action-send-mail@v3
        with:
          server_address: smtp.zoho.eu
          server_port: 587
          username: ${{ secrets.SMTP_USER }}
          password: ${{ secrets.SMTP_PASS }}
          subject: "⚠️ [Monitor CRM] Fallo en sync — ${{ github.run_id }}"
          to: crm@universae.com
          from: "Monitor CRM <${{ secrets.SMTP_USER }}>"
          body: |
            El workflow de sincronización del CRM ha fallado.

            Fecha: ${{ github.run_started_at }}
            Rama: ${{ github.ref_name }}
            Ver logs: https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}
```

## Secretos en GitHub Actions

| Secret | Descripción |
|--------|-------------|
| `ZOHO_REFRESH_TOKEN` | OAuth refresh token de Zoho |
| `ZOHO_CLIENT_ID` | Client ID de la app Zoho |
| `ZOHO_CLIENT_SECRET` | Client secret de la app Zoho |
| `SMTP_USER` | Email SMTP (zoho.eu) para notificaciones |
| `SMTP_PASS` | Password SMTP |

## Reglas de datos sensibles

El repo es **público**. Nunca guardar:
- URLs de webhooks (contienen tokens)
- Valores de variables
- Emails, nombres o IDs de usuarios
- API keys ni tokens

Solo estructura: nombres de módulos/campos/reglas, tipos, configuraciones.
