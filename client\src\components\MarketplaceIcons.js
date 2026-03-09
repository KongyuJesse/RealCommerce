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
      <path
        d="M7 10L12 15L17 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MapPinIcon({ size = 18 }) {
  return (
    <svg {...iconProps(size)}>
      <path
        d="M12 20C12 20 18 14.2 18 9.5C18 6.46 15.31 4 12 4C8.69 4 6 6.46 6 9.5C6 14.2 12 20 12 20Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="9.5" r="2.3" fill="currentColor" />
    </svg>
  );
}

function CartIcon({ size = 24 }) {
  return (
    <svg {...iconProps(size)}>
      <path
        d="M4 5H6L8.1 14.5H18.5L20.5 8H9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="18" r="1.6" fill="currentColor" />
      <circle cx="17" cy="18" r="1.6" fill="currentColor" />
    </svg>
  );
}

function FlagUsaIcon({ size = 18 }) {
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

export { CaretDownIcon, CartIcon, FlagUsaIcon, MapPinIcon, MenuIcon, SearchIcon };
