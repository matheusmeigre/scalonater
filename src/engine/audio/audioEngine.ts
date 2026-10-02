import { Howl, Howler } from 'howler'
import { SFX_RECIPES, type SfxName, type Synth } from './sfx'

export type MusicTrack = 'map' | 'game'

const MUSIC: Record<MusicTrack, { src: string[]; volume: number }> = {
  map: { src: ['/audio/music/map.webm', '/audio/music/map.mp3'], volume: 0.32 },
  game: { src: ['/audio/music/game.webm', '/audio/music/game.mp3'], volume: 0.22 },
}
const FADE_MS = 600

export interface AudioPrefs {
  muted: boolean
  music: boolean
  sfx: boolean
}

/**
 * Áudio global. A música toca pelo Howler e os efeitos são sintetizados no mesmo
 * AudioContext, ligados ao `Howler.masterGain`. Assim um único `Howler.mute()`
 * cala tudo. Nada toca antes do primeiro gesto (exigência dos navegadores).
 */
class AudioEngine {
  private prefs: AudioPrefs = { muted: false, music: true, sfx: true }
  private sfxOut: GainNode | null = null
  private noiseBuf: AudioBuffer | null = null
  private wanted: MusicTrack | null = null
  private current: { track: MusicTrack; howl: Howl } | null = null
  private howls = new Map<MusicTrack, Howl>()
  private lastAt = new Map<SfxName, number>()
  private unlocked = false

  constructor() {
    Howler.autoSuspend = false
    Howler.autoUnlock = true
  }

  /** Chamar em todo gesto até o áudio estar liberado. */
  unlock = () => {
    try {
      // iOS: trata como reprodução de mídia, que toca mesmo com a chave de silêncio ligada.
      const nav = navigator as Navigator & { audioSession?: { type: string } }
      if (nav.audioSession) nav.audioSession.type = 'playback'
    } catch {
      /* sem suporte */
    }
    if (!Howler.ctx) Howler.volume(Howler.volume())
    const ctx = Howler.ctx
    if (!ctx) return
    if (ctx.state !== 'running') void ctx.resume().catch(() => undefined)
    if (!this.unlocked) {
      this.unlocked = true
      try {
        // Um buffer mudo dentro do gesto "acorda" o áudio no Safari.
        const b = ctx.createBufferSource()
        b.buffer = ctx.createBuffer(1, 1, 22050)
        b.connect(ctx.destination)
        b.start(0)
      } catch {
        /* ignora */
      }
      this.syncMusic()
    }
  }

  setPrefs(prefs: AudioPrefs) {
    this.prefs = prefs
    Howler.mute(prefs.muted)
    this.syncMusic()
  }

  play(name: SfxName) {
    if (this.prefs.muted || !this.prefs.sfx) return
    const ctx = Howler.ctx
    if (!ctx || !Howler.masterGain) return
    if (ctx.state !== 'running') {
      void ctx.resume().catch(() => undefined)
      return
    }
    const now = ctx.currentTime
    const last = this.lastAt.get(name)
    if (last !== undefined && now - last < 0.05) return // evita empilhar o mesmo som
    this.lastAt.set(name, now)
    try {
      SFX_RECIPES[name](this.synth(ctx))
    } catch {
      /* áudio nunca derruba o jogo */
    }
  }

  /** Pede uma trilha (ou silêncio). Troca com fade. */
  music(track: MusicTrack | null) {
    this.wanted = track
    this.syncMusic()
  }

  private syncMusic() {
    const target = this.unlocked && this.prefs.music ? this.wanted : null
    if (this.current?.track === target) {
      if (target && !this.current.howl.playing()) this.current.howl.play()
      return
    }
    if (this.current) {
      const { howl } = this.current
      howl.fade(howl.volume(), 0, FADE_MS)
      howl.once('fade', () => howl.pause())
      this.current = null
    }
    if (!target) return
    const howl = this.howl(target)
    howl.volume(0)
    if (!howl.playing()) howl.play()
    howl.fade(0, MUSIC[target].volume, FADE_MS)
    this.current = { track: target, howl }
  }

  private howl(track: MusicTrack) {
    let h = this.howls.get(track)
    if (!h) {
      h = new Howl({ src: MUSIC[track].src, loop: true, volume: 0, preload: true, html5: false })
      this.howls.set(track, h)
    }
    return h
  }

  private synth(ctx: AudioContext): Synth {
    if (!this.sfxOut) {
      this.sfxOut = ctx.createGain()
      this.sfxOut.gain.value = 0.55
      this.sfxOut.connect(Howler.masterGain)
      this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
      const d = this.noiseBuf.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    }
    const out = this.sfxOut
    const noiseBuf = this.noiseBuf
    const synth: Synth = {
      tone(f, dur, { type = 'sine', vol = 0.2, at = 0, slide = 0 } = {}) {
        const t = ctx.currentTime + at
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = type
        o.frequency.setValueAtTime(f, t)
        if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur)
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(vol, t + 0.006)
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
        o.connect(g)
        g.connect(out)
        o.start(t)
        o.stop(t + dur + 0.03)
      },
      noise(dur, { vol = 0.15, at = 0, freq = 900, to = 0 } = {}) {
        if (!noiseBuf) return
        const t = ctx.currentTime + at
        const s = ctx.createBufferSource()
        const f = ctx.createBiquadFilter()
        const g = ctx.createGain()
        s.buffer = noiseBuf
        f.type = 'bandpass'
        f.Q.value = 1.2
        f.frequency.setValueAtTime(freq, t)
        if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur)
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(vol, t + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
        s.connect(f)
        f.connect(g)
        g.connect(out)
        s.start(t)
        s.stop(t + dur + 0.03)
      },
      notes(fs, { step = 0.1, dur = 0.16, type = 'triangle', vol = 0.16, last = 0 } = {}) {
        fs.forEach((f, i) =>
          synth.tone(f, i === fs.length - 1 && last ? last : dur, { type, vol, at: i * step }),
        )
      },
    }
    return synth
  }
}

export const audio = new AudioEngine()

/** Liga o desbloqueio do áudio aos gestos do jogador. Chamar uma vez no início. */
export function installAudioUnlock() {
  const events = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const
  events.forEach((ev) =>
    window.addEventListener(ev, audio.unlock, { capture: true, passive: true }),
  )
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) audio.unlock()
  })
}

export type { SfxName }
