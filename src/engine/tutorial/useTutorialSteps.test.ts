import { describe, expect, it } from 'vitest'
import { advanceTutorialStep, type TutorialStepDef } from './useTutorialSteps'

type Trigger = 'select' | 'place' | 'done'

const STEPS: TutorialStepDef<Trigger>[] = [
  { advanceOn: 'select' },
  { advanceOn: 'place' },
  { advanceOn: 'done' },
]

describe('advanceTutorialStep', () => {
  it('avança uma etapa quando o gatilho da etapa atual acontece', () => {
    expect(advanceTutorialStep(STEPS, 0, 'select')).toBe(1)
  })

  it('não avança quando o gatilho não combina com a etapa atual nem com nenhuma depois', () => {
    const steps: TutorialStepDef<Trigger>[] = [{ advanceOn: 'select' }, { advanceOn: 'select' }]
    expect(advanceTutorialStep(steps, 0, 'done')).toBe(0)
  })

  it('pula direto para a etapa certa quando o jogador se adianta', () => {
    // Está na etapa 0 (select), mas o jogador já colocou a peça (etapa 1).
    expect(advanceTutorialStep(STEPS, 0, 'place')).toBe(2)
  })

  it('pula até o fim quando o gatilho é de uma etapa bem adiante', () => {
    expect(advanceTutorialStep(STEPS, 0, 'done')).toBe(3)
  })

  it('ignora gatilho nulo', () => {
    expect(advanceTutorialStep(STEPS, 1, null)).toBe(1)
  })

  it('não avança além do fim das etapas', () => {
    expect(advanceTutorialStep(STEPS, 3, 'done')).toBe(3)
  })
})
