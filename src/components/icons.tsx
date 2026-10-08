type IconProps = { className?: string; size?: number; strokeWidth?: number };

function base(path: React.ReactNode, { className = "", size = 22, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

export const SearchIcon = (p: IconProps) => base(<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>, p);
export const CartIcon = (p: IconProps) => base(<><path d="M3.5 4.5h2.2l2 10.2a1.6 1.6 0 0 0 1.6 1.3h7.9a1.6 1.6 0 0 0 1.6-1.2l1.5-6.3H7" /><circle cx="10" cy="19.6" r="1.2" /><circle cx="17" cy="19.6" r="1.2" /></>, p);
export const UserIcon = (p: IconProps) => base(<><circle cx="12" cy="8.5" r="3.8" /><path d="M4.8 20c1.2-3.5 4-5.2 7.2-5.2s6 1.7 7.2 5.2" /></>, p);
export const HomeIcon = (p: IconProps) => base(<><path d="M4 10.5 12 4l8 6.5" /><path d="M6 9v10.5h12V9" /><path d="M10 19.5v-5h4v5" /></>, p);
export const GridIcon = (p: IconProps) => base(<><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></>, p);
export const HeartIcon = (p: IconProps) => base(<path d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10Z" />, p);
export const ChevronRight = (p: IconProps) => base(<path d="m9 5 7 7-7 7" />, p);
export const ChevronLeft = (p: IconProps) => base(<path d="m15 5-7 7 7 7" />, p);
export const TruckIcon = (p: IconProps) => base(<><path d="M3 6.5h11v9H3z" /><path d="M14 9.5h3.6l3 3.2v2.8H14" /><circle cx="7" cy="17.5" r="1.7" /><circle cx="17.5" cy="17.5" r="1.7" /></>, p);
export const SnowIcon = (p: IconProps) => base(<><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" /><path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2" /></>, p);
export const LeafIcon = (p: IconProps) => base(<><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14" /><path d="M5 19 13 11" /></>, p);
export const ShieldIcon = (p: IconProps) => base(<><path d="M12 3.5 5 6v5.5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></>, p);
export const ClockIcon = (p: IconProps) => base(<><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></>, p);
export const StarIcon = ({ className = "", size = 14, filled = true }: IconProps & { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
    <path d="m12 3.2 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);
export const ChatIcon = (p: IconProps) => base(<><path d="M5 18.5V7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v6a2.5 2.5 0 0 1-2.5 2.5H8.5z" /><path d="M9 10h6M9 13h3.5" /></>, p);
export const CloseIcon = (p: IconProps) => base(<path d="M6 6l12 12M18 6 6 18" />, p);
export const MenuIcon = (p: IconProps) => base(<path d="M4 7h16M4 12h16M4 17h16" />, p);
export const BowlIcon = (p: IconProps) => base(<><path d="M3.5 11h17a8.5 8.5 0 0 1-17 0Z" /><path d="M8 7.5c0-1.2 1-1.2 1-2.5M12 7.5c0-1.2 1-1.2 1-2.5M16 7.5c0-1.2 1-1.2 1-2.5" /></>, p);
export const GiftIcon = (p: IconProps) => base(<><rect x="4" y="9" width="16" height="11" rx="1.5" /><path d="M3 9h18M12 9v11" /><path d="M12 9c-1-3-5-4.5-5.5-2S10 9 12 9Zm0 0c1-3 5-4.5 5.5-2S14 9 12 9Z" /></>, p);
export const PlusIcon = (p: IconProps) => base(<path d="M12 5v14M5 12h14" />, p);
export const MinusIcon = (p: IconProps) => base(<path d="M5 12h14" />, p);
