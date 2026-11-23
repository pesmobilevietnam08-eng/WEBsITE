import type { SVGProps } from 'react';

export type IconName =
  | 'book'
  | 'chat'
  | 'chart'
  | 'settings'
  | 'mic'
  | 'mic-off'
  | 'speaker'
  | 'stop'
  | 'search'
  | 'check'
  | 'x'
  | 'alert'
  | 'info'
  | 'chevron-down'
  | 'chevron-right'
  | 'arrow-left'
  | 'sun'
  | 'moon'
  | 'shuffle'
  | 'clock'
  | 'download'
  | 'upload'
  | 'trash'
  | 'external'
  | 'refresh'
  | 'flame'
  | 'stamp'
  | 'keyboard'
  | 'eye'
  | 'eye-off';

export interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {renderPaths(name)}
    </svg>
  );
}

function renderPaths(name: IconName) {
  switch (name) {
    case 'book':
      return (
        <>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z" />
          <path d="M8 7h8" />
          <path d="M8 11h6" />
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        </>
      );
    case 'chat':
      return (
        <>
          <path d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H9l-5 4V6Z" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
        </>
      );
    case 'chart':
      return (
        <>
          <path d="M4 20h16" />
          <rect x="6" y="12" width="3" height="8" rx="1" />
          <rect x="11" y="7" width="3" height="13" rx="1" />
          <rect x="16" y="4" width="3" height="16" rx="1" />
        </>
      );
    case 'settings':
      return (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </>
      );
    case 'mic':
      return (
        <>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <path d="M12 18v3" />
          <path d="M9 21h6" />
        </>
      );
    case 'mic-off':
      return (
        <>
          <path d="M3 3l18 18" />
          <path d="M9 9v2a3 3 0 0 0 5.12 2.12" />
          <path d="M15 9.34V6a3 3 0 0 0-5.94-.6" />
          <path d="M17 16.95A7 7 0 0 1 5 11" />
          <path d="M19 11a7 7 0 0 1-.11 1.23" />
          <path d="M12 18v3" />
        </>
      );
    case 'speaker':
      return (
        <>
          <path d="M4 9v6h4l5 4V5L8 9H4Z" />
          <path d="M16.5 8.5a5 5 0 0 1 0 7" />
          <path d="M19.2 6a8.5 8.5 0 0 1 0 12" />
        </>
      );
    case 'stop':
      return <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />;
    case 'search':
      return (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </>
      );
    case 'check':
      return <path d="m5 12.5 4.5 4.5L19 7.5" />;
    case 'x':
      return (
        <>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </>
      );
    case 'alert':
      return (
        <>
          <path d="M12 3 2.5 19.5h19L12 3Z" />
          <path d="M12 9.5v4.5" />
          <circle cx="12" cy="16.8" r="0.7" fill="currentColor" />
        </>
      );
    case 'info':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <circle cx="12" cy="8" r="0.7" fill="currentColor" />
        </>
      );
    case 'chevron-down':
      return <path d="m6 9 6 6 6-6" />;
    case 'chevron-right':
      return <path d="m9 6 6 6-6 6" />;
    case 'arrow-left':
      return (
        <>
          <path d="M19 12H5" />
          <path d="m11 6-6 6 6 6" />
        </>
      );
    case 'sun':
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </>
      );
    case 'moon':
      return <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />;
    case 'shuffle':
      return (
        <>
          <path d="M16 3h5v5" />
          <path d="M4 20 21 3" />
          <path d="M21 16v5h-5" />
          <path d="M15 15l6 6" />
          <path d="M4 4l5 5" />
        </>
      );
    case 'clock':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      );
    case 'download':
      return (
        <>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M4 19h16" />
        </>
      );
    case 'upload':
      return (
        <>
          <path d="M12 15V3" />
          <path d="m7 8 5-5 5 5" />
          <path d="M4 19h16" />
        </>
      );
    case 'trash':
      return (
        <>
          <path d="M4 7h16" />
          <path d="M9 7V4h6v3" />
          <path d="M6 7l1 13h10l1-13" />
          <path d="M10 11v6M14 11v6" />
        </>
      );
    case 'external':
      return (
        <>
          <path d="M14 4h6v6" />
          <path d="M10 14 20 4" />
          <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
        </>
      );
    case 'refresh':
      return (
        <>
          <path d="M20 11a8 8 0 1 0-2.3 5.65" />
          <path d="M20 4v7h-7" />
        </>
      );
    case 'flame':
      return (
        <path d="M12 2.5c1.8 3.2 5.5 5.4 5.5 10a5.5 5.5 0 1 1-11 0c0-2.2 1-4.1 2.2-5.6.3 1.4 1.3 2.1 2.1 2.3-.5-2.1-.2-4.6 1.2-6.7Z" />
      );
    case 'stamp':
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="6" strokeDasharray="3 2" />
          <path d="M9 12.2 11.2 14.4 15.4 10" />
        </>
      );
    case 'keyboard':
      return (
        <>
          <rect x="3" y="6" width="18" height="12" rx="2.5" />
          <path d="M7 10h.01M10 10h.01M13 10h.01M16 10h.01M8 14h8" />
        </>
      );
    case 'eye':
      return (
        <>
          <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z" />
          <circle cx="12" cy="12" r="2.7" />
        </>
      );
    case 'eye-off':
      return (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2.5 2.5 0 0 0 3.4 3.4" />
          <path d="M6.7 6.8C4.3 8.4 2.8 10.7 2 12c1.6 2.7 5.2 6.5 10 6.5 1.8 0 3.4-.5 4.9-1.2" />
          <path d="M14.1 5.8A10.7 10.7 0 0 1 22 12a12.5 12.5 0 0 1-2.5 3.2" />
        </>
      );
  }
}
