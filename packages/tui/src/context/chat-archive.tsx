import { createStore } from "solid-js/store"
import { createSimpleContext } from "./helper"
import { useEvent } from "./event"
import { useSync } from "./sync"
import { useTuiPaths } from "./runtime"
import { createMemo, onMount } from "solid-js"
import type { Message, Part } from "@opencode-ai/sdk/v2"
import path from "node:path"
import { mkdir } from "node:fs/promises"
import { readJson, writeJsonAtomic, readText, writeText } from "../util/persistence"

export interface ArchivedChatMeta {
  id: string
  sessionID: string
  title: string
  preview: string
  timeUpdated: number
}

export interface ArchivedChat extends ArchivedChatMeta {
  content: string
}

export const { use: useChatArchive, provider: ChatArchiveProvider } = createSimpleContext({
  name: "ChatArchive",
  init: () => {
    const paths = useTuiPaths()
    const sync = useSync()
    const event = useEvent()
    const archiveDir = path.join(paths.state, "chat-archive")
    const indexFile = path.join(archiveDir, "index.json")

    const [store, setStore] = createStore<{
      chats: ArchivedChatMeta[]
      ready: boolean
    }>({
      chats: [],
      ready: false,
    })

    function formatTranscript(messages: { info: Message; parts: Part[] }[]): string {
      return messages
        .map((m) => {
          const role = m.info.role.toUpperCase()
          const parts = m.parts
            .filter((p) => p.type === "text" && !(p as any).synthetic && !(p as any).ignored)
            .map((p) => (p as any).text)
            .join("\n")
          return `[${role}]\n${parts}`
        })
        .join("\n\n---\n\n")
    }

    function getPreview(parts: Part[]): string {
      const text = parts
        .filter((p) => p.type === "text" && !(p as any).synthetic && !(p as any).ignored)
        .map((p) => (p as any).text)
        .join(" ")
        .slice(0, 150)
        .trim()
      return text || ""
    }

    async function saveChat(sessionID: string) {
      const session = sync.session.get(sessionID)
      if (!session) return
      const messages = sync.data.message[sessionID]
      if (!messages || messages.length === 0) return

      const partsMap = sync.data.part
      const messagesWithParts = messages.map((m) => ({ info: m, parts: partsMap[m.id] ?? [] }))
      const content = formatTranscript(messagesWithParts)
      const preview = getPreview((partsMap[messages[messages.length - 1]?.id] ?? []))

      await mkdir(archiveDir, { recursive: true })

      const chatFile = path.join(archiveDir, `${sessionID}.txt`)
      await writeText(chatFile, content).catch(() => {})

      const meta: ArchivedChatMeta = {
        id: sessionID,
        sessionID,
        title: session.title,
        preview,
        timeUpdated: session.time.updated,
      }

      const existing = await readJson<{ chats: ArchivedChatMeta[] }>(indexFile)
        .then((d) => d?.chats ?? [])
        .catch(() => [])

      const idx = existing.findIndex((c) => c.id === sessionID)
      if (idx >= 0) existing[idx] = meta
      else existing.unshift(meta)

      const trimmed = existing.slice(0, 200)
      await writeJsonAtomic(indexFile, { chats: trimmed }).catch(() => {})
      setStore("chats", trimmed)
    }

    let saveTimeout: ReturnType<typeof setTimeout> | undefined
    let pendingSessions = new Set<string>()

    function debouncedSave(sessionID: string) {
      pendingSessions.add(sessionID)
      if (saveTimeout) clearTimeout(saveTimeout)
      saveTimeout = setTimeout(async () => {
        const sessions = [...pendingSessions]
        pendingSessions = new Set()
        for (const id of sessions) {
          await saveChat(id)
        }
      }, 3000)
    }

    function loadIndex() {
      readJson<{ chats: ArchivedChatMeta[] }>(indexFile)
        .then((d) => {
          if (d?.chats) setStore("chats", d.chats)
        })
        .catch(() => {})
        .finally(() => setStore("ready", true))
    }

    onMount(() => {
      loadIndex()
    })

    event.on("message.part.updated", (evt) => {
      debouncedSave(evt.properties.part.sessionID)
    })

    event.on("message.updated", (evt) => {
      debouncedSave(evt.properties.info.sessionID)
    })

    event.on("session.updated", (evt) => {
      debouncedSave(evt.properties.info.id)
    })

    return {
      get chats() {
        return store.chats
      },
      get ready() {
        return store.ready
      },
      async loadContent(sessionID: string): Promise<string | undefined> {
        const chatFile = path.join(archiveDir, `${sessionID}.txt`)
        try {
          return await readText(chatFile)
        } catch {
          return undefined
        }
      },
      async saveNow(sessionID: string) {
        await saveChat(sessionID)
      },
      refresh: loadIndex,
    }
  },
})
