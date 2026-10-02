import type { ReactNode } from 'react'
import { SHELL } from '@/content/shell'
import { audio } from '@/engine/audio/audioEngine'
import { useSettings } from '@/engine/store/settingsStore'
import { buttonClass } from './Button'
import type { KernelMood } from './Kernel'
import { Narrator } from './Narrator'
import { Panel } from './Panel'
import { cx } from './format'
import { Icon } from './icons'

export interface GameFrameProps {
  /**
   * Classe CSS do próprio jogo com o `grid-template-areas` da partida (ex.:
   * "cores-layout"). Ela precisa nomear ao menos as áreas `level`, `stats`,
   * `ctrl` e `nar`; o resto do campo de jogo é de cada jogo (áreas próprias,
   * como `cpu`/`queue`/`io` no Núcleos).
   */
  layoutClassName: string
  /** Atributos extras no elemento raiz (ex.: `data-io`). */
  rootProps?: Record<string, string | number | boolean | undefined>
  /** Conteúdo do painel de fase (ícone/kicker, título, selos). */
  level: ReactNode
  /** Conteúdo do HUD (estatísticas da partida). */
  hud: ReactNode
  /** Restante da cena: cada jogo desenha o próprio campo com suas áreas de grid. */
  children: ReactNode
  /** Fala atual do Kernel. */
  narration: { text: string; mood?: KernelMood }
  speaker?: string
  speakerRole?: string
  paused: boolean
  onPauseChange: (paused: boolean) => void
  onRestart: () => void
  /** Botões extras nos controles, antes dos padrão (mudo/pausar/recomeçar). */
  extraControls?: ReactNode
}

const CONTROL_BTN =
  'roomy:h-[60px] roomy:min-w-[60px] roomy:rounded-lg roomy:px-6 roomy:text-[17px] roomy:[--d:6px] roomy:[&_svg]:size-6'

/**
 * Moldura comum da partida: painel de fase, HUD, controles (mudo, pausar,
 * recomeçar) e o narrador, todos posicionados pelas áreas de grid `level`,
 * `stats`, `ctrl` e `nar` que o CSS de cada jogo declara. O campo de jogo
 * (`children`) é passado adiante como está: cada jogo mantém seu próprio
 * layout e áreas de grid ali dentro.
 */
export function GameFrame({
  layoutClassName,
  rootProps,
  level,
  hud,
  children,
  narration,
  speaker = SHELL.opening.speaker,
  speakerRole,
  paused,
  onPauseChange,
  onRestart,
  extraControls,
}: GameFrameProps) {
  const muted = useSettings((s) => s.muted)
  const toggleMute = useSettings((s) => s.toggle)

  return (
    <div className={cx(layoutClassName, 'safe-pt safe-px safe-pb')} data-game-active {...rootProps}>
      <Panel className="flex min-w-0 items-center gap-2.5 rounded-[12px] py-[5px] pr-2.5 pl-[5px] [grid-area:level] roomy:gap-3.5 roomy:rounded-lg roomy:py-2 roomy:pr-5 roomy:pl-3">
        {level}
      </Panel>

      <div className="min-w-0 [grid-area:stats]">{hud}</div>

      <div className="flex items-center justify-end gap-2 [grid-area:ctrl] roomy:gap-3">
        {extraControls}
        <button
          type="button"
          className={buttonClass('ghost', 'sm', CONTROL_BTN)}
          aria-label={muted ? SHELL.a11y.muteOn : SHELL.a11y.muteOff}
          aria-pressed={muted}
          onClick={() => toggleMute('muted')}
        >
          <Icon name={muted ? 'sound-off' : 'sound-on'} />
        </button>
        <button
          type="button"
          className={buttonClass('cyan', 'sm', CONTROL_BTN)}
          aria-label={SHELL.a11y.pause}
          onClick={() => onPauseChange(!paused)}
        >
          <Icon name="pause" />
          <span className="hidden side:inline">{SHELL.controls.pause}</span>
        </button>
        <button
          type="button"
          className={buttonClass('orange', 'sm', CONTROL_BTN)}
          aria-label={SHELL.a11y.restart}
          onClick={() => {
            audio.play('click')
            onRestart()
          }}
        >
          <Icon name="restart" />
          <span className="hidden side:inline">{SHELL.controls.restart}</span>
        </button>
      </div>

      {children}

      <Narrator
        className="[grid-area:nar]"
        message={narration.text}
        mood={narration.mood}
        speaker={speaker}
        role={speakerRole}
      />
    </div>
  )
}
