import {
  Key,
  ShieldCheck,
  Info,
  AlertTriangle,
  ArrowRight,
  Check,
  X,
  MapPin,
  Phone,
  Share2,
  Globe,
  ChevronDown,
  CalendarClock,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

const ICONS = {
  'key': Key,
  'shield-check': ShieldCheck,
  'info': Info,
  'alert-triangle': AlertTriangle,
  'arrow-right': ArrowRight,
  'check': Check,
  'x': X,
  'map-pin': MapPin,
  'phone': Phone,
  'share-2': Share2,
  'globe': Globe,
  'chevron-down': ChevronDown,
  'calendar-clock': CalendarClock,
} as const;

type IconName = keyof typeof ICONS;

interface IconProps extends Omit<LucideProps, 'aria-hidden' | 'role' | 'aria-label'> {
  name: IconName;
  label?: string;
  size?: number;
  className?: string;
}

export function Icon({ name, label, size = 20, className, ...rest }: IconProps) {
  const Component = ICONS[name];

  if (label) {
    return (
      <Component
        size={size}
        strokeWidth={1.5}
        color="currentColor"
        className={className}
        role="img"
        aria-label={label}
        {...rest}
      />
    );
  }

  return (
    <Component
      size={size}
      strokeWidth={1.5}
      color="currentColor"
      className={className}
      aria-hidden="true"
      {...rest}
    />
  );
}
