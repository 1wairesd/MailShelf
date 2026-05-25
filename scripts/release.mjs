#!/usr/bin/env node
/**
 * npm run release [patch|minor|major]
 *
 * 1. Bumps version in package.json
 * 2. Commits the change
 * 3. Creates a git tag vX.Y.Z
 * 4. Pushes commit + tag → triggers GitHub Actions build
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgPath = resolve(__dirname, '../package.json')

// ── Parse args ───────────────────────────────────────────────────────────────

const bumpType = process.argv[2] ?? 'patch'
if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error(`Usage: npm run release [patch|minor|major]`)
  console.error(`Got: "${bumpType}"`)
  process.exit(1)
}

// ── Read current version ─────────────────────────────────────────────────────

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
const [major, minor, patch] = pkg.version.split('.').map(Number)

let nextVersion
if (bumpType === 'major') nextVersion = `${major + 1}.0.0`
else if (bumpType === 'minor') nextVersion = `${major}.${minor + 1}.0`
else nextVersion = `${major}.${minor}.${patch + 1}`

const tag = `v${nextVersion}`

// ── Confirm ──────────────────────────────────────────────────────────────────

console.log(`\n  Current version : v${pkg.version}`)
console.log(`  Next version    : ${tag}  (${bumpType} bump)`)
console.log(`  This will push a tag to GitHub and trigger a full build.\n`)

// Simple y/n prompt (sync, no deps)
import { createInterface } from 'readline'
const rl = createInterface({ input: process.stdin, output: process.stdout })
const answer = await new Promise(resolve => rl.question('  Continue? [y/N] ', resolve))
rl.close()

if (answer.toLowerCase() !== 'y') {
  console.log('  Aborted.')
  process.exit(0)
}

// ── Check working tree is clean ──────────────────────────────────────────────

try {
  const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim()
  if (status) {
    console.error('\n  ✗ Working tree is not clean. Commit or stash your changes first.\n')
    console.error(status)
    process.exit(1)
  }
} catch {
  console.error('  ✗ git not found or not a git repository.')
  process.exit(1)
}

// ── Bump version ─────────────────────────────────────────────────────────────

pkg.version = nextVersion
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
console.log(`\n  ✓ Bumped package.json → ${nextVersion}`)

// ── Commit + tag + push ──────────────────────────────────────────────────────

const run = (cmd) => {
  console.log(`  $ ${cmd}`)
  execSync(cmd, { stdio: 'inherit' })
}

try {
  run(`git add package.json`)
  run(`git commit -m "chore: release ${tag}"`)
  run(`git tag ${tag}`)
  run(`git push`)
  run(`git push origin ${tag}`)

  console.log(`\n  ✓ Released ${tag}`)
  console.log(`  GitHub Actions will now build for Windows, macOS, and Linux.`)

  // Extract owner/repo from package.json repository URL
  const repoUrl = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url ?? ''
  const match = repoUrl.match(/github\.com[/:]([^/]+\/[^/.]+?)(?:\.git)?$/)
  const repoPath = match ? match[1] : '[owner]/MailShelf'
  console.log(`  Watch progress at: https://github.com/${repoPath}/actions\n`)
} catch (err) {
  console.error('\n  ✗ Git operation failed:', err.message)
  // Rollback package.json
  pkg.version = `${major}.${minor}.${patch}`
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
  console.error('  package.json version rolled back.')
  process.exit(1)
}
