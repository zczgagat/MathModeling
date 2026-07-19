<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import markedKatex from 'marked-katex-extension'
import 'katex/dist/katex.min.css'

const docs = ref([])
const selectedId = ref('')
const currentDoc = ref(null)
const query = ref('')
const loading = ref(true)
const docLoading = ref(false)
const sidebarOpen = ref(false)
const error = ref('')
const article = ref(null)
let searchTimer

marked.use({ gfm: true, breaks: false })
marked.use(markedKatex({ throwOnError: false, nonStandard: true }))

const groupedDocs = computed(() => {
  const groups = new Map()
  for (const doc of docs.value) {
    if (!groups.has(doc.category)) groups.set(doc.category, [])
    groups.get(doc.category).push(doc)
  }
  return [...groups.entries()].map(([category, items]) => ({ category, items }))
})

const renderedMarkdown = computed(() => {
  if (!currentDoc.value) return ''
  return DOMPurify.sanitize(marked.parse(currentDoc.value.markdown), {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['target'],
  })
})

const headings = computed(() => {
  if (!currentDoc.value) return []
  return [...currentDoc.value.markdown.matchAll(/^(#{2,3})\s+(.+)$/gm)].map((match, index) => ({
    level: match[1].length,
    text: match[2].replace(/[*_`]/g, ''),
    index,
  }))
})

async function loadDocs() {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch(`/api/docs?q=${encodeURIComponent(query.value)}`)
    if (!response.ok) throw new Error('文档目录加载失败')
    const data = await response.json()
    docs.value = data.docs
    if (!selectedId.value && docs.value.length) {
      const home = docs.value.find((doc) => doc.id.toLowerCase() === 'readme.md')
      await selectDoc(home?.id || docs.value[0].id)
    }
  } catch (reason) {
    error.value = reason.message
  } finally {
    loading.value = false
  }
}

async function selectDoc(id) {
  selectedId.value = id
  docLoading.value = true
  sidebarOpen.value = false
  error.value = ''
  try {
    const response = await fetch(`/api/docs/${encodeURI(id)}`)
    if (!response.ok) throw new Error('文档内容加载失败')
    currentDoc.value = await response.json()
    window.history.replaceState(null, '', `#${encodeURIComponent(id)}`)
    await nextTick()
    window.scrollTo({ top: 0, behavior: 'smooth' })
    addHeadingIds()
  } catch (reason) {
    error.value = reason.message
  } finally {
    docLoading.value = false
  }
}

function addHeadingIds() {
  if (!article.value) return
  article.value.querySelectorAll('h2, h3').forEach((node, index) => {
    node.id = `section-${index}`
  })
  article.value.querySelectorAll('a').forEach((link) => {
    if (link.host && link.host !== window.location.host) {
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
    }
  })
}

function jumpTo(index) {
  document.getElementById(`section-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function handleArticleClick(event) {
  const link = event.target.closest('a')
  if (!link) return
  const href = link.getAttribute('href') || ''
  if (!href || !/\.md(?:$|#)/i.test(href)) return

  const cleanHref = decodeURI(href.split('#')[0]).replace(/^\.\//, '')
  const currentParts = currentDoc.value.id.split('/')
  currentParts.pop()
  const combined = href.startsWith('/')
    ? cleanHref.replace(/^\//, '')
    : [...currentParts, cleanHref].join('/')
  const normalized = combined
    .split('/')
    .reduce((parts, part) => {
      if (part === '..') parts.pop()
      else if (part && part !== '.') parts.push(part)
      return parts
    }, [])
    .join('/')

  if (docs.value.some((doc) => doc.id === normalized)) {
    event.preventDefault()
    selectDoc(normalized)
  }
}

watch(query, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(loadDocs, 220)
})

onMounted(async () => {
  const hashId = decodeURIComponent(window.location.hash.slice(1))
  await loadDocs()
  if (hashId && docs.value.some((doc) => doc.id === hashId)) await selectDoc(hashId)
})
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <button class="icon-button menu-button" aria-label="打开目录" @click="sidebarOpen = true">
        <span></span><span></span><span></span>
      </button>
      <div class="brand">
        <div class="brand-mark">M</div>
        <div>
          <strong>数学建模知识库</strong>
          <small>从问题到模型，从模型到答案</small>
        </div>
      </div>
      <div class="topbar-count">{{ docs.length }} 篇文档</div>
    </header>

    <div class="layout">
      <div v-if="sidebarOpen" class="scrim" @click="sidebarOpen = false"></div>
      <aside class="sidebar" :class="{ open: sidebarOpen }">
        <div class="sidebar-head">
          <span>文档目录</span>
          <button class="close-button" @click="sidebarOpen = false">×</button>
        </div>
        <label class="search-box">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" /></svg>
          <input v-model="query" type="search" placeholder="搜索标题或全文…" />
        </label>

        <div class="nav-scroll">
          <p v-if="loading" class="status">正在扫描文档…</p>
          <p v-else-if="!docs.length" class="status">没有找到相关文档</p>
          <section v-for="group in groupedDocs" :key="group.category" class="nav-group">
            <h2>{{ group.category }}</h2>
            <button
              v-for="doc in group.items"
              :key="doc.id"
              class="doc-link"
              :class="{ active: selectedId === doc.id }"
              @click="selectDoc(doc.id)"
            >
              <span>{{ doc.title }}</span>
              <small>{{ doc.excerpt }}</small>
            </button>
          </section>
        </div>
      </aside>

      <main class="content">
        <div v-if="error" class="error-card">{{ error }}</div>
        <div v-else-if="docLoading || !currentDoc" class="reading-state">
          <div class="loader"></div>
          <p>正在打开文档…</p>
        </div>
        <div v-else class="reading-layout">
          <article ref="article" class="markdown-body" @click="handleArticleClick" v-html="renderedMarkdown"></article>
          <aside v-if="headings.length" class="toc">
            <span>本页目录</span>
            <button
              v-for="heading in headings"
              :key="heading.index"
              :class="{ nested: heading.level === 3 }"
              @click="jumpTo(heading.index)"
            >{{ heading.text }}</button>
          </aside>
        </div>
      </main>
    </div>
  </div>
</template>
