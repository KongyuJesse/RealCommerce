function iconProps(size = 20) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': 'true',
  };
}

function MenuIcon({ size = 18 }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M4 7H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon({ size = 20 }) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth="2" />
      <path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CaretDownIcon({ size = 14 }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MapPinIcon({ size = 18 }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M12 20C12 20 18 14.2 18 9.5C18 6.46 15.31 4 12 4C8.69 4 6 6.46 6 9.5C6 14.2 12 20 12 20Z" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="9.5" r="2.3" fill="currentColor" />
    </svg>
  );
}

function CartIcon({ size = 24 }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M4 5H6L8.1 14.5H18.5L20.5 8H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="18" r="1.6" fill="currentColor" />
      <circle cx="17" cy="18" r="1.6" fill="currentColor" />
    </svg>
  );
}

function FlagIcon({ size = 18 }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="3" y="5" width="18" height="14" rx="2" fill="#FFFFFF" />
      <rect x="3" y="5" width="18" height="2" fill="#B22234" />
      <rect x="3" y="9" width="18" height="2" fill="#B22234" />
      <rect x="3" y="13" width="18" height="2" fill="#B22234" />
      <rect x="3" y="17" width="18" height="2" fill="#B22234" />
      <rect x="3" y="5" width="8" height="8" fill="#3C3B6E" />
      <circle cx="5.2" cy="7.2" r="0.6" fill="#FFFFFF" />
      <circle cx="7.6" cy="7.2" r="0.6" fill="#FFFFFF" />
      <circle cx="10" cy="7.2" r="0.6" fill="#FFFFFF" />
      <circle cx="6.4" cy="9.6" r="0.6" fill="#FFFFFF" />
      <circle cx="8.8" cy="9.6" r="0.6" fill="#FFFFFF" />
      <circle cx="5.2" cy="12" r="0.6" fill="#FFFFFF" />
      <circle cx="7.6" cy="12" r="0.6" fill="#FFFFFF" />
      <circle cx="10" cy="12" r="0.6" fill="#FFFFFF" />
    </svg>
  );
}

function ShieldIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

function TruckIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="1" y="3" width="15" height="13" rx="1" stroke="currentColor" strokeWidth="2" />
      <path d="M16 8h4l2 3v5h-6V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="5.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="18.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function StarIcon({ size = 16, filled = true }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function CreditCardIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
      <line x1="1" y1="10" x2="23" y2="10" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function HeartIcon({ size = 16, filled = false }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function PackageIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChartBarIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="3" y="12" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="10" y="8" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="17" y="4" width="4" height="16" rx="1" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function LockIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GlobeIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function EyeIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function EyeOffIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14.12 14.12a3 3 0 11-4.24-4.24M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function AlertCircleIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

function CheckCircleIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ZapIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export {
  AlertCircleIcon,
  CaretDownIcon,
  CartIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CreditCardIcon,
  EyeIcon,
  EyeOffIcon,
  FlagIcon,
  GlobeIcon,
  HeartIcon,
  LockIcon,
  MapPinIcon,
  MenuIcon,
  PackageIcon,
  RefreshIcon,
  SearchIcon,
  ShieldIcon,
  StarIcon,
  TruckIcon,
  ZapIcon,
};
