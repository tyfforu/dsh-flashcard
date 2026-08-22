/**
 * Icons for dsh-flashcard, in the DSH sidebar's outline style (16×16
 * viewBox, currentColor, 1.5px stroke) — the same convention
 * dsh-better-sidebar uses for its per-tab glyphs.
 */

export interface FlashcardIconProps {
  size?: number
  className?: string
}

/**
 * Flashcard glyph: two overlapping rounded cards with a memory-flash mark on
 * the top card. Outline style so it matches the sidebar's other tab icons.
 */
export const IconFlashcard16 = ({ size = 16, className }: FlashcardIconProps) => (
  <svg width={size} height={size} className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1.6" y="2.8" width="9.6" height="7.6" rx="1.6" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
    <rect x="4.2" y="5.2" width="9.8" height="8" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
    <path d="M9.7 7.3 8.5 9.9h1.7L8.8 12.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
