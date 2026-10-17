// Read-only readiness check for releasing this project: git, Supabase login/link, pending migrations.
// Usage: npm run release:check
// It never pushes, deploys or changes anything. Exit code 1 means something blocks a release.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const PROJECT_REF = 'ivutsksddeoqxmzcmqfy' // "winainu-lab's Project" (Seoul), used by the Vercel site
const SITE_URL = 'https://reading-and-writing-app.vercel.app'
const GITHUB_REPO = 'winainu-lab/ReadingAndWritingApp'

const problems = []
const notes = []
const run = (command, args, options = {}) => spawnSync(command, args, { encoding: 'utf8', timeout: 120_000, ...options })
const line = (ok, text) => console.log(`${ok ? 'OK  ' : 'FAIL'} ${text}`)
const clean = (text) => text.split('\n').filter((row) => !/new version|recommend updating/i.test(row)).join('\n').trim()

// --- git ---
const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim()
const status = run('git', ['status', '--porcelain']).stdout.trim()
const remote = run('git', ['remote', 'get-url', 'origin']).stdout.trim()
const ahead = run('git', ['rev-list', '--count', 'origin/main..HEAD']).stdout.trim()
const user = `${run('git', ['config', 'user.name']).stdout.trim()} <${run('git', ['config', 'user.email']).stdout.trim()}>`
line(remote.includes(GITHUB_REPO), `git remote: ${remote || '(none)'}${remote.includes(GITHUB_REPO) ? '' : `  ← expected ${GITHUB_REPO}`}`)
if (!remote.includes(GITHUB_REPO)) problems.push(`ตั้ง remote: git remote add origin https://github.com/${GITHUB_REPO}.git`)
line(true, `git user: ${user} · branch: ${branch}`)
line(!status, status ? `มีไฟล์ที่ยังไม่ commit ${status.split('\n').length} รายการ` : 'working tree สะอาด')
if (status) notes.push('มีไฟล์ที่ยังไม่ commit')
notes.push(Number(ahead) > 0 ? `มี ${ahead} commit ที่ยังไม่ push` : 'ไม่มี commit ค้าง push')

// --- supabase cli / login ---
const cli = run('supabase', ['--version'])
if (cli.status !== 0) {
  line(false, 'ไม่พบ Supabase CLI')
  problems.push('ติดตั้ง Supabase CLI ก่อน: https://supabase.com/docs/guides/cli')
} else {
  line(true, `Supabase CLI ${cli.stdout.trim()}`)
  const projects = run('supabase', ['projects', 'list'])
  const listed = clean(projects.stdout + projects.stderr)
  const canSee = projects.status === 0 && listed.includes(PROJECT_REF)
  line(canSee, canSee ? `บัญชีที่ล็อกอินเห็นโปรเจคจริง ${PROJECT_REF}` : `บัญชีที่ล็อกอินอยู่ มองไม่เห็นโปรเจค ${PROJECT_REF}`)
  if (!canSee) problems.push('รัน: supabase logout แล้ว supabase login ด้วยบัญชีเจ้าของโปรเจค (หรือตั้ง SUPABASE_ACCESS_TOKEN)')

  // --- link ---
  const linked = existsSync('supabase/.temp/project-ref') ? readFileSync('supabase/.temp/project-ref', 'utf8').trim() : ''
  line(linked === PROJECT_REF, linked ? `โฟลเดอร์ผูกกับโปรเจค ${linked}` : 'ยังไม่ได้ผูกโปรเจค (supabase link)')
  if (linked !== PROJECT_REF) problems.push(`รัน: supabase link --project-ref ${PROJECT_REF}`)

  // --- migrations (also proves the database password works; the CLI may cache it after `supabase link`) ---
  if (canSee && linked === PROJECT_REF) {
    const list = run('supabase', ['migration', 'list', '--linked'])
    const text = clean(list.stdout + list.stderr)
    if (list.status !== 0) {
      line(false, 'อ่านรายการ migration บน production ไม่ได้ (รหัสผ่านฐานข้อมูลอาจยังไม่ได้ตั้ง)')
      console.log(text)
      problems.push('ตั้งรหัสผ่านฐานข้อมูลใน env var SUPABASE_DB_PASSWORD แล้วรันใหม่ (ดู CLAUDE.md)')
    } else {
      const pending = text.split(/\r?\n/).filter((row) => /^\s*\d{14}\s*\|\s*\|/.test(row)).map((row) => row.trim().split(/\s*\|\s*/)[0])
      line(true, pending.length ? `migration ที่ยังไม่ขึ้น production: ${pending.length} ไฟล์ (${pending.join(', ')})` : 'เชื่อมต่อฐานข้อมูลจริงได้ และ migration ครบแล้ว')
      if (pending.length) notes.push(`ต้อง supabase db push (${pending.length} migration)`)
    }
  } else {
    notes.push('ข้ามการตรวจ migration เพราะยังไม่ได้ล็อกอิน/ผูกโปรเจคตามข้อด้านบน')
  }
}

// --- deployed site ---
try {
  const html = await (await fetch(SITE_URL, { signal: AbortSignal.timeout(15_000) })).text()
  const bundle = html.match(/assets\/index-[\w-]+\.js/)?.[0]
  line(Boolean(bundle), `เว็บจริงเปิดได้ (${bundle ?? 'ไม่พบไฟล์ JS'})`)
} catch {
  line(false, `เปิดเว็บ ${SITE_URL} ไม่ได้`)
}

console.log('\nสรุป:')
for (const note of notes) console.log(` - ${note}`)
if (problems.length) {
  console.log('\nต้องแก้ก่อน release:')
  for (const problem of problems) console.log(` * ${problem}`)
  process.exitCode = 1
} else {
  console.log('\nพร้อม release: ให้ Claude ทำตามขั้นตอนใน CLAUDE.md (สำรอง → db push → deploy functions → git push)')
}
