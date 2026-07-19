import { createServer as createHttpServer } from 'node:http'
import { readFile, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, extname, join, normalize, relative, resolve, sep } from 'node:path'
import { networkInterfaces } from 'node:os'
import { fileURLToPath } from 'node:url'

const appDir = fileURLToPath(new URL('.', import.meta.url))
const docsRoot = resolve(appDir, '..')
const host = process.env.HOST || '0.0.0.0'
const port = Number(process.env.PORT || 5173)
const production = process.argv.includes('--production')

const ignoredDirectories = new Set([
  '.git', '.agents', '.codex', 'node_modules', 'dist', basename(appDir),
])

function toId(filePath) {
  return relative(docsRoot, filePath).split(sep).join('/')
}

function cleanTitle(fileName, markdown) {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim()
  return heading || fileName.replace(/^\d+-/, '').replace(/\.md$/i, '')
}

function plainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!?(\[([^\]]*)\])\([^)]*\)/g, '$2')
    .replace(/[#>*_|~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function walkMarkdown(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
      files.push(...await walkMarkdown(join(directory, entry.name)))
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') {
      files.push(join(directory, entry.name))
    }
  }
  return files
}

async function listDocs(query = '') {
  const files = await walkMarkdown(docsRoot)
  const keyword = query.trim().toLocaleLowerCase('zh-CN')
  const docs = await Promise.all(files.map(async (filePath) => {
    const [markdown, info] = await Promise.all([
      readFile(filePath, 'utf8'),
      stat(filePath),
    ])
    const id = toId(filePath)
    const parts = id.split('/')
    const category = parts.length > 1 ? parts[0] : '项目首页'
    const text = plainText(markdown)
    const title = cleanTitle(parts.at(-1), markdown)
    return {
      id,
      title,
      category,
      excerpt: text.slice(0, 150),
      updatedAt: info.mtime.toISOString(),
      searchable: `${title} ${category} ${text}`.toLocaleLowerCase('zh-CN'),
    }
  }))

  const naturalCollator = new Intl.Collator('zh-CN', {
    numeric: true,
    sensitivity: 'base',
  })

  const categoryOrder = (category) => {
    if (category === '项目首页') return -1
    const chapter = category.match(/^第(\d+)章/)
    return chapter ? Number(chapter[1]) : Number.MAX_SAFE_INTEGER
  }

  return docs
    .filter((doc) => !keyword || doc.searchable.includes(keyword))
    .map(({ searchable, ...doc }) => doc)
    .sort((a, b) => {
      const chapterDifference = categoryOrder(a.category) - categoryOrder(b.category)
      if (chapterDifference) return chapterDifference
      const categoryDifference = naturalCollator.compare(a.category, b.category)
      return categoryDifference || naturalCollator.compare(a.id, b.id)
    })
}

function safeDocPath(id) {
  const decoded = decodeURIComponent(id || '')
  const target = resolve(docsRoot, normalize(decoded))
  const rootPrefix = `${docsRoot}${sep}`
  if ((!target.startsWith(rootPrefix) && target !== docsRoot) || extname(target).toLowerCase() !== '.md') {
    return null
  }
  if (target.startsWith(`${appDir}${sep}`)) return null
  return target
}

function json(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(data))
}

async function handleApi(request, response, url) {
  if (url.pathname === '/api/docs') {
    const docs = await listDocs(url.searchParams.get('q') || '')
    return json(response, 200, { docs, count: docs.length })
  }

  if (url.pathname.startsWith('/api/docs/')) {
    const filePath = safeDocPath(url.pathname.slice('/api/docs/'.length))
    if (!filePath || !existsSync(filePath)) {
      return json(response, 404, { error: '文档不存在' })
    }
    const markdown = await readFile(filePath, 'utf8')
    const id = toId(filePath)
    return json(response, 200, {
      id,
      title: cleanTitle(id.split('/').at(-1), markdown),
      markdown,
    })
  }

  return json(response, 404, { error: '接口不存在' })
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

async function serveProduction(request, response, url) {
  let target = resolve(appDir, 'dist', `.${url.pathname}`)
  const distRoot = resolve(appDir, 'dist')
  if (!target.startsWith(distRoot) || !existsSync(target) || (await stat(target)).isDirectory()) {
    target = join(distRoot, 'index.html')
  }
  const body = await readFile(target)
  response.writeHead(200, { 'Content-Type': mimeTypes[extname(target)] || 'application/octet-stream' })
  response.end(body)
}

let vite
if (!production) {
  const { createServer } = await import('vite')
  vite = await createServer({
    root: appDir,
    server: { middlewareMode: true },
    appType: 'spa',
  })
}

const server = createHttpServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`)
    if (url.pathname.startsWith('/api/')) return await handleApi(request, response, url)
    if (production) return await serveProduction(request, response, url)
    vite.middlewares(request, response, (error) => {
      if (error) {
        console.error(error)
        response.statusCode = 500
        response.end('开发服务器错误')
      }
    })
  } catch (error) {
    console.error(error)
    json(response, 500, { error: '服务器内部错误' })
  }
})

server.listen(port, host, () => {
  const addresses = []
  for (const interfaces of Object.values(networkInterfaces())) {
    for (const item of interfaces || []) {
      if (item.family === 'IPv4' && !item.internal) addresses.push(`http://${item.address}:${port}`)
    }
  }
  console.log('\n数学建模知识库已启动')
  console.log(`电脑访问：http://localhost:${port}`)
  for (const address of addresses) console.log(`手机访问：${address}`)
  console.log('手机和电脑需要连接同一局域网；停止服务请按 Ctrl+C。\n')
})
