import { Button, Chip, Divider, FormControlLabel, Switch, TextField, Typography } from '@mui/material'
import { CircleAlert, CircleCheck, MessageSquarePlus } from 'lucide-react'
import { RouterSettingsFields } from '@/features/router-settings/RouterSettingsFields'
import { useChatStore } from '@/stores/chatStore'
import { missingRouterFields, useRouterSettings } from '@/stores/routerStore'

export function ChatSettings({ autoFocus }: { autoFocus?: boolean }) {
  const { stream, systemPrompt, conversationId, setSettings, newConversation } = useChatStore()
  const missing = missingRouterFields(useRouterSettings())

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Typography sx={{ fontWeight: 600, fontSize: 14 }} className="flex-1">
            9Router · wajib untuk chat
          </Typography>
          {missing.length === 0 ? (
            <Chip size="small" color="success" variant="outlined" icon={<CircleCheck size={13} />} label="Lengkap" />
          ) : (
            <Chip size="small" color="warning" variant="outlined" icon={<CircleAlert size={13} />} label={`${missing.length} belum diisi`} />
          )}
        </div>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Middleware meneruskan chat ke 9Router milikmu, jadi alamat, key, dan model harus diisi sebelum mengirim pesan.
        </Typography>
      </div>

      <RouterSettingsFields highlightMissing autoFocus={autoFocus} />

      <Divider />

      <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Opsional</Typography>

      <FormControlLabel
        control={<Switch checked={stream} onChange={(e) => setSettings({ stream: e.target.checked })} />}
        label="Streaming"
      />

      <TextField
        label="System prompt"
        size="small"
        multiline
        minRows={3}
        maxRows={8}
        value={systemPrompt}
        onChange={(e) => setSettings({ systemPrompt: e.target.value })}
        helperText="Middleware menaruh skill, context pack, dan catatan memori di depan prompt ini."
      />

      <div className="flex flex-col gap-1">
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          ID percakapan (X-Conversation-Id)
        </Typography>
        <Typography variant="caption" className="font-mono break-all">
          {conversationId}
        </Typography>
      </div>

      <Button variant="outlined" startIcon={<MessageSquarePlus size={16} />} onClick={newConversation}>
        Percakapan baru
      </Button>
    </div>
  )
}
