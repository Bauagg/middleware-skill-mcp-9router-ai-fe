import { useState } from 'react'
import { Autocomplete, IconButton, InputAdornment, TextField } from '@mui/material'
import { Eye, EyeOff } from 'lucide-react'
import { useModels } from '@/features/chat/api'
import { getErrorMessage } from '@/lib/axios'
import { useRouterSettings } from '@/stores/routerStore'

interface Props {
  /** mark empty fields as errors (used in Chat, where all three are needed to send) */
  highlightMissing?: boolean
  autoFocus?: boolean
}

/**
 * URL, key and model of the user's own 9Router: all three are required to chat. Also used by evals
 * and the fallback skill picker. Saved in this browser, separately per account.
 */
export function RouterSettingsFields({ highlightMissing, autoFocus }: Props) {
  const { url, key, model, update } = useRouterSettings()
  const [showKey, setShowKey] = useState(false)
  const models = useModels({ url, key })
  const options = models.data?.map((m) => m.id) ?? []
  const missing = (v: string) => !!highlightMissing && v.trim() === ''

  return (
    <div className="flex flex-col gap-4">
      <TextField
        label="Alamat 9Router"
        required
        size="small"
        value={url}
        onChange={(e) => update({ url: e.target.value.trim() })}
        placeholder="https://domain-9router/v1"
        autoComplete="off"
        autoFocus={autoFocus && !url}
        error={missing(url)}
        helperText="Alamat API 9Router milikmu, biasanya diakhiri /v1"
      />

      <TextField
        label="Key 9Router"
        required
        size="small"
        type={showKey ? 'text' : 'password'}
        value={key}
        onChange={(e) => update({ key: e.target.value.trim() })}
        placeholder="sk-..."
        autoComplete="off"
        error={missing(key)}
        helperText="Biaya chat masuk ke akun 9Router ini. Disimpan di browser ini saja."
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  edge="end"
                  onClick={() => setShowKey((v) => !v)}
                  aria-label={showKey ? 'Sembunyikan key' : 'Tampilkan key'}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />

      <Autocomplete
        freeSolo
        size="small"
        options={options}
        value={model}
        onInputChange={(_, v) => update({ model: v })}
        loading={models.isFetching}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Model"
            required
            placeholder="mis. AI-Crypro"
            error={models.isError || missing(model)}
            helperText={
              models.isError
                ? `Daftar model gagal dimuat: ${getErrorMessage(models.error)}`
                : options.length
                  ? `Pilih dari ${options.length} model di 9Router kamu`
                  : 'Isi alamat dan key dulu untuk memuat daftar model, atau ketik manual'
            }
          />
        )}
      />
    </div>
  )
}
