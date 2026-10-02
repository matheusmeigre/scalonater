import { create } from 'zustand'
import { defaultSettings, getRepository, type Settings } from '../persistence'

type Editable = Omit<Settings, 'version'>

interface SettingsStore extends Settings {
  hydrated: boolean
  hydrate: () => Promise<void>
  set: <K extends keyof Editable>(key: K, value: Editable[K]) => void
  toggle: (key: 'muted' | 'music' | 'sfx' | 'untimed' | 'reduceMotion') => void
}

const pick = (s: SettingsStore): Settings => ({
  version: 1,
  muted: s.muted,
  music: s.music,
  sfx: s.sfx,
  untimed: s.untimed,
  difficulty: s.difficulty,
  reduceMotion: s.reduceMotion,
})

export const useSettings = create<SettingsStore>((set, get) => ({
  ...defaultSettings(),
  hydrated: false,
  hydrate: async () => {
    const s = await getRepository().loadSettings()
    set({ ...s, hydrated: true })
  },
  set: (key, value) => {
    set({ [key]: value } as Partial<SettingsStore>)
    void getRepository().saveSettings(pick(get()))
  },
  toggle: (key) => get().set(key, !get()[key]),
}))
