import { ipcMain, app, shell } from 'electron'
import fs from 'fs'
import https from 'https'
import path from 'path'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff > 0 ? 1 : -1
  }
  return 0
}

/** Reads the GitHub owner/repo slug from package.json's repository field. */
function getOwnerRepo(): string | null {
  const pkgPath = path.join(__dirname, '../../../package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
    repository?: { url?: string } | string
  }
  const repoUrl = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url ?? ''
  const match = repoUrl.match(/github\.com[/:]([^/]+\/[^/.]+?)(?:\.git)?$/)
  return match ? match[1] : null
}

/** Fetches the latest release tag from GitHub API. */
function fetchLatestTag(ownerRepo: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      `https://api.github.com/repos/${ownerRepo}/releases/latest`,
      {
        headers: {
          'User-Agent': 'MailShelf-UpdateCheck',
          'Accept':     'application/vnd.github+json',
        },
      },
      (res) => {
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => {
          try {
            const json = JSON.parse(data) as { tag_name?: string; message?: string }
            if (json.tag_name) resolve(json.tag_name)
            else reject(new Error(json.message ?? 'No tag_name in response'))
          } catch (e) {
            reject(e)
          }
        })
      }
    )
    req.on('error', reject)
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Request timed out')) })
  })
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

export function registerAppIpc() {
  ipcMain.handle('app:getVersion', () => app.getVersion())

  ipcMain.handle('app:openExternal', (_e, url: unknown) => {
    if (typeof url === 'string' && url.startsWith('https://github.com/')) {
      shell.openExternal(url)
    }
  })

  ipcMain.handle('app:checkForUpdates', async () => {
    const currentVersion = app.getVersion()
    const normalize = (v: string) => v.replace(/^v/, '')

    try {
      const ownerRepo = getOwnerRepo()
      if (!ownerRepo) {
        return { hasUpdate: false, currentVersion: `v${currentVersion}`, error: 'No GitHub repository configured' }
      }

      const latestTag = await fetchLatestTag(ownerRepo)
      const latest    = normalize(latestTag)
      const current   = normalize(currentVersion)
      const hasUpdate = latest !== current && compareVersions(latest, current) > 0

      return {
        hasUpdate,
        currentVersion: `v${current}`,
        latestVersion:  `v${latest}`,
        releaseUrl:     `https://github.com/${ownerRepo}/releases/latest`,
      }
    } catch (err) {
      return { hasUpdate: false, currentVersion: `v${currentVersion}`, error: String(err) }
    }
  })
}
