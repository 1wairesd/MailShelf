#!/usr/bin/env node
/**
 * Release script
 *
 * Stable:
 *   npm run release              → patch bump:  1.0.0 → 1.0.1
 *   npm run release minor        → minor bump:  1.0.0 → 1.1.0
 *   npm run release major        → major bump:  1.0.0 → 2.0.0
 *
 * Pre-release:
 *   npm run release beta         → 1.0.1-beta.0  (or bumps beta.N if already on beta)
 *   npm run release beta minor   → 1.1.0-beta.0
 *   npm run release rc           → 1.0.1-rc.0
 *   npm run release rc minor     → 1.1.0-rc.0
 *
 * Promote pre-release to stable:
 *   npm run release stable       → 1.0.1-beta.3 → 1.0.1
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgPath = resolve(__dirname, '../package.json')

// ── Parse args ───────────────────────────────────────────────────────────────

const [arg1, arg2] = process.argv.slice(2)

const CHANNELS = ['beta', 'rc']
const BUMPS    = ['patch', 'minor', 'major']

let channel  = null   // 'beta' | 'rc' | null
let bumpType = 'patch'
let promote  = false

if (arg1 === 'stable') {
  promote = true
} else if (CHANNELS.includes(arg1)) {
  channel  = arg1
  bumpType = BUMPS.includes(arg2) ? arg2 : 'patch'
} else if (BUMPS.includes(arg1)) {
  bumpType = arg1
} else if (arg1 !== undefined) {
  console.error(`Usage:`)
  console.error(`  npm run release [patch|minor|major]`)
  console.error(`  npm run release beta [patch|minor|major]`)
  console.error(`  npm run release rc   [patch|minor|major]`)
  console.error(`  npm run release stable`)
  process.exit(1)
}

// ── Read current version ─────────────────────────────────────────────────────

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
const current = pkg.version  // e.g. "1.0.9" or "1.0.10-beta.2"

// Parse semver with optional pre-release
const semverRe = /^(\d+)\.(\d+)\.(\d+)(?:-(beta|rc)\.(\d+))?$/
const m = current.match(semverRe)
if (!m) {
  console.error(`  ✗ Cannot parse version: ${current}`)
  process.exit(1)
}

let [, maj, min, pat, curChannel, curPre] = m
maj = Number(maj); min = Number(min); pat = Number(pat)
curPre = curPre !== undefined ? Number(curPre) : null

function bumpBase(type) {
  if (type === 'major') return [maj + 1, 0, 0]
  if (type === 'minor') return [maj, min + 1, 0]
  return [maj, min, pat + 1]
}

let nextVersion

if (promote) {
  // stable: strip pre-release suffix
  if (!curChannel) {
    console.error(`  ✗ Current version ${current} is already stable.`)
    process.exit(1)
  }
  nextVersion = `${maj}.${min}.${pat}`

} else if (channel) {
  // pre-release bump
  if (curChannel === channel) {
    // already on this channel — just bump the pre number
    nextVersion = `${maj}.${min}.${pat}-${channel}.${curPre + 1}`
  } else {
    // switching channel or starting fresh — bump base version first
    const [nMaj, nMin, nPat] = bumpBase(bumpType)
    nextVersion = `${nMaj}.${nMin}.${nPat}-${channel}.0`
  }

} else {
  // stable bump — must not be on a pre-release
  if (curChannel) {
    console.error(`  ✗ Currently on pre-release ${current}.`)
    console.error(`  Use "npm run release stable" to promote, or "npm run release ${channel}" to bump pre.`)
    process.exit(1)
  }
  const [nMaj, nMin, nPat] = bumpBase(bumpType)
  nextVersion = `${nMaj}.${nMin}.${nPat}`
}

const tag = `v${nextVersion}`
const isPrerelease = nextVersion.includes('-')

// ── Confirm ──────────────────────────────────────────────────────────────────

console.log(`\n  Current version : v${current}`)
console.log(`  Next version    : ${tag}${isPrerelease ? '  (pre-release — will NOT be marked as latest)' : ''}`)
console.log(`  This will push a tag to GitHub and trigger a full build.\n`)

const rl = createInterface({ input: process.stdin, output: process.stdout })
const answer = await new Promise(r => rl.question('  Continue? [y/N] ', r))
rl.close()

if (answer.toLowerCase() !== 'y') {
  console.log('  Aborted.')
  process.exit(0)
}

// ── Check working tree ────────────────────────────────────────────────────────

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

// ── Bump version ──────────────────────────────────────────────────────────────

pkg.version = nextVersion
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
console.log(`\n  ✓ Bumped package.json → ${nextVersion}`)

// ── Commit + tag + push ───────────────────────────────────────────────────────

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
  if (isPrerelease) {
    console.log(`  ⚠  Pre-release: users on stable channel won't receive this update.`)
    console.log(`     Run "npm run release stable" when ready to promote.`)
  }

  const repoUrl = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url ?? ''
  const match = repoUrl.match(/github\.com[/:]([^/]+\/[^/.]+?)(?:\.git)?$/)
  const repoPath = match ? match[1] : '[owner]/MailShelf'
  console.log(`  Watch progress at: https://github.com/${repoPath}/actions\n`)
} catch (err) {
  console.error('\n  ✗ Git operation failed:', err.message)
  pkg.version = current
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
  console.error('  package.json version rolled back.')
  process.exit(1)
}
