import { createMemo, createSignal, For, Show } from "solid-js"
import { useTheme } from "../context/theme"
import { useRoute } from "../context/route"
import { useChatArchive, type ArchivedChatMeta } from "../context/chat-archive"
import { useTerminalDimensions } from "@opentui/solid"
import { Locale } from "../util/locale"
import { getScrollAcceleration } from "../util/scroll"
import { useTuiConfig } from "../config"
import { useSync } from "../context/sync"
import { useBindings } from "../keymap"
import { RGBA } from "@opentui/core"

const backdropColor = RGBA.fromInts(0, 0, 0, 100)

export function ChatPanel() {
  const route = useRoute()
  const archive = useChatArchive()
  const sync = useSync()
  const { theme } = useTheme()
  const tuiConfig = useTuiConfig()
  const dimensions = useTerminalDimensions()
  const [open, setOpen] = createSignal(false)
  const scrollAcceleration = createMemo(() => getScrollAcceleration(tuiConfig))
  const [selectedIdx, setSelectedIdx] = createSignal(0)

  const allChats = createMemo(() => {
    const archiveChats = archive.chats
    const syncSessions = sync.data.session
      .filter((s) => s.parentID === undefined)
      .filter((s) => !archiveChats.some((c) => c.id === s.id))

    const fromArchive = archiveChats.map((c) => ({
      id: c.id,
      title: c.title,
      timeUpdated: c.timeUpdated,
      preview: c.preview,
      source: "archive" as const,
    }))

    const fromSync = syncSessions.map((s) => ({
      id: s.id,
      title: s.title,
      timeUpdated: s.time.updated,
      preview: "",
      source: "live" as const,
    }))

    return [...fromArchive, ...fromSync].sort((a, b) => b.timeUpdated - a.timeUpdated)
  })

  function handleSelect(chatID: string) {
    route.navigate({ type: "session", sessionID: chatID })
    setOpen(false)
  }

  function toggle() {
    if (open()) {
      setOpen(false)
      return
    }
    setOpen(true)
    setSelectedIdx(0)
  }

  useBindings(() => ({
    enabled: open(),
    bindings: [
      {
        key: "escape",
        cmd: () => setOpen(false),
      },
      {
        key: "j",
        cmd: () => setSelectedIdx((i) => Math.min(i + 1, Math.max(0, allChats().length - 1))),
      },
      {
        key: "k",
        cmd: () => setSelectedIdx((i) => Math.max(i - 1, 0)),
      },
      {
        key: "enter",
        cmd: () => {
          const chats = allChats()
          const idx = selectedIdx()
          if (idx >= 0 && idx < chats.length) handleSelect(chats[idx].id)
        },
      },
    ],
  }))

  const panelWidth = Math.min(50, Math.floor(dimensions().width * 0.5))
  const itemsPerScreen = Math.max(1, dimensions().height - 4)
  const startIdx = createMemo(() => {
    const total = allChats().length
    const sel = selectedIdx()
    return Math.max(0, Math.min(sel - Math.floor(itemsPerScreen / 2), Math.max(0, total - itemsPerScreen)))
  })
  const visibleChats = createMemo(() => allChats().slice(startIdx(), startIdx() + itemsPerScreen))
  const isOpen = createMemo(() => open())

  return (
    <>
      <box
        onMouseDown={(e: { stopPropagation(): void }) => {
          e.stopPropagation()
          toggle()
        }}
        width={4}
        flexShrink={0}
        alignItems="center"
        paddingLeft={1}
      >
        <text fg={isOpen() ? theme.accent : theme.textMuted}>
          <b>☰</b>
        </text>
      </box>
      <Show when={open()}>
        <box
          position="absolute"
          top={0}
          left={0}
          width={dimensions().width}
          height={dimensions().height}
          zIndex={2500}
          flexDirection="row"
        >
          <box
            width={panelWidth}
            height={dimensions().height}
            backgroundColor={theme.backgroundPanel}
            paddingTop={1}
            paddingLeft={1}
            paddingRight={1}
            flexDirection="column"
          >
            <box flexShrink={0} paddingBottom={1} paddingLeft={1}>
              <text fg={theme.text}>
                <b>Chats</b>
              </text>
              <text fg={theme.textMuted}> {allChats().length} total</text>
            </box>
            <scrollbox
              flexGrow={1}
              scrollAcceleration={scrollAcceleration()}
              verticalScrollbarOptions={{
                trackOptions: {
                  backgroundColor: theme.background,
                  foregroundColor: theme.borderActive,
                },
              }}
            >
              <box flexShrink={0}>
                <For each={visibleChats()}>
                  {(chat, idx) => {
                    const absoluteIdx = startIdx() + idx()
                    const isSelected = absoluteIdx === selectedIdx()
                    return (
                      <box
                        onMouseDown={() => {
                          handleSelect(chat.id)
                        }}
                        onMouseOver={() => setSelectedIdx(absoluteIdx)}
                        paddingLeft={1}
                        paddingRight={1}
                        paddingTop={0}
                        paddingBottom={0}
                        backgroundColor={isSelected ? theme.backgroundElement : undefined}
                        border={isSelected ? ["left"] : undefined}
                        borderColor={isSelected ? theme.accent : undefined}
                        flexShrink={0}
                      >
                        <text fg={isSelected ? theme.text : theme.textMuted}>
                          <b>{chat.title || "(untitled)"}</b>
                          <Show when={chat.source === "archive"}>
                            <span style={{ fg: theme.success }}> 💾</span>
                          </Show>
                        </text>
                        <Show when={chat.preview}>
                          <text fg={theme.textMuted}>{chat.preview.slice(0, panelWidth - 4)}</text>
                        </Show>
                        <text fg={theme.textMuted}>{Locale.todayTimeOrDateTime(chat.timeUpdated)}</text>
                      </box>
                    )
                  }}
                </For>
              </box>
            </scrollbox>
            <box flexShrink={0} paddingTop={1} paddingLeft={1}>
              <text fg={theme.textMuted}>j/k navigate · Enter open · Esc close</text>
            </box>
          </box>
          <box flexGrow={1} onMouseDown={() => setOpen(false)} backgroundColor={backdropColor} />
        </box>
      </Show>
    </>
  )
}
