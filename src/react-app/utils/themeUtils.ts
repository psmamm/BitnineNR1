import { Theme } from '../contexts/ThemeContext';

/**
 * Get theme-aware background color classes (dark mode only)
 */
export function getCardBg(_theme: Theme): string {
  return 'bg-[#0D0F18]';
}

/**
 * Get theme-aware border color classes (dark mode only)
 */
export function getCardBorder(_theme: Theme): string {
  return 'border-white/10';
}

/**
 * Get theme-aware text color classes (dark mode only)
 */
export function getTextColor(_theme: Theme, variant: 'primary' | 'secondary' | 'muted' = 'primary'): string {
  switch (variant) {
    case 'primary': return 'text-white';
    case 'secondary': return 'text-[#BDC3C7]';
    case 'muted': return 'text-[#7F8C8D]';
    default: return 'text-white';
  }
}

/**
 * Get theme-aware hover background classes (dark mode only)
 */
export function getHoverBg(_theme: Theme): string {
  return 'hover:bg-white/5';
}

/**
 * Get theme-aware card classes (dark mode only)
 */
export function getCardClasses(_theme: Theme): string {
  return `${getCardBg(_theme)} ${getCardBorder(_theme)} rounded-xl p-4 border`;
}

