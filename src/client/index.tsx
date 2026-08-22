/**
 * Client half of dsh-flashcard:
 *   - registers a "闪卡" tab in the right sidebar through ctx.betterSidebar
 *   - registers a "闪卡" settings section through ctx.slots so users can
 *     tune the plugin from the DSH settings page (left-side nav category
 *     "闪卡", right-side body rendered by FlashcardSettings).
 */
import type { ClientContext, TabComponentProps } from '../types.ts'
import { FlashcardView } from './FlashcardView.tsx'
import { FlashcardSettings } from './FlashcardSettings.tsx'
import { IconFlashcard16 } from './icons.tsx'

export const inject = ['betterSidebar', 'slots']

export function apply(ctx: ClientContext): void {
  ctx.betterSidebar.registerTab({
    id: 'dsh-flashcard',
    title: '闪卡',
    icon: (size: number) => <IconFlashcard16 size={size} />,
    single: true,
    order: 50,
    component: (props: TabComponentProps) => FlashcardView(props),
  })

  // DSH settings page: a "闪卡" entry in the left category nav. The body
  // is rendered by FlashcardSettings, which talks to the host through the
  // /flashcard/api/settings routes.
  ctx.slots.inject('settings.section', () => ctx.slots.register(
    {
      name: 'settings.section',
      id: 'flashcard',
      order: 200,
      label: () => '闪卡',
    },
    FlashcardSettings,
  ))
}
