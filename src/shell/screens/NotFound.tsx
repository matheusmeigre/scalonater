import { SHELL } from '@/content/shell'
import { ButtonLink } from '@/ui/Button'
import { Kernel } from '@/ui/Kernel'
import { ScreenFrame } from '../ScreenFrame'

export function NotFound() {
  return (
    <ScreenFrame className="items-center justify-center text-center">
      <Kernel mood="think" className="size-24" />
      <h1 data-screen-title className="m-0 text-[32px] uppercase outline-none">
        {SHELL.notFound.title}
      </h1>
      <p className="m-0 text-muted">{SHELL.notFound.body}</p>
      <ButtonLink to="/" icon="map" size="lg">
        {SHELL.common.backToMap}
      </ButtonLink>
    </ScreenFrame>
  )
}
