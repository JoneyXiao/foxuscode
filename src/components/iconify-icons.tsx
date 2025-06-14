interface IconProps {
  className?: string;
  size?: number;
}

function LanguageIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2 5h14M9 2v3m4 0q-2 8-9 11m2-7q2 4 6 6m1 7l5-11l5 11m-1.4-3h-7.2"/>
    </svg>
  );
}

function FoxIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={className} viewBox="0 0 512 512" fill="currentColor">
        <path d="m214.5 23.24l-1 8.1c-14 61.5 21 88.66 21 88.66l11-13s-24-19.76-18-63.56c41 11.6 58 36.6 64 48.8c-44 15.76-56 57.26-80 87.96l21-3.9l-2 31.3s44-8.7 69 17.7c5-8.6 8-18.9 6-29.2l-3-28.2c-3-1.1-7-3-11-5.4c-12-7.3-25-19.1-25-19.1c-2-1.9-2-5.2-1-7.8c2-2.5 5-3.7 7-2.7c0 0 11 3.5 21 6.7c11 3.9 20 14.3 21 26.6c1 8.4 3 18.9 4 28.3c2 15.4-3 30.8-12 42.7l7 18.3h38l7-18.3c-9-11.9-14-27.3-12-42.7c1-9.4 3-19.9 4-28.3c1-12.3 10-22.7 21-26.6c10-3.2 21-6.7 21-6.7c2-1 5 .2 7 2.7c1 2.6 1 5.9-1 7.8c0 0-13 11.8-25 19.1c-4 2.4-8 4.3-11 5.4l-3 28.2c-2 10.3 1 20.6 6 29.2c25-26.4 69-17.7 69-17.7l-2-31.3l21 3.9c-24-30.7-36-72.2-80-87.96c6-12.2 23-37.2 64-48.8c6 43.8-18 63.56-18 63.56l11 13s35-27.16 21-88.66l-1-8.1c-43.3 7.32-85.9 35.37-110 62.9c-5.5-.13-10.5-.52-16 0c-42.8-34.75-61.3-56.12-110-62.9m24.7 205.26c38.2 53.2-87.7 46.6-153.61 119.5c-26.11 28-32.53 56.3-25.95 80.3c12.23 44 71.86 73 144.06 55c49.8-13 96-32 134.8-40c35.1-8 63.8-5 82.3 24l15.3-5c-2.9-38-14.4-68.8-36.5-87.5c-16.8-14.2-39.9-22-70.9-21.1c-29.3.8-65.9 9.3-111.2 27.3c-27 9.5-76.5 27.7-102.4 12.6c-9.1-5.6-11.9-15-11.2-24.3c34.4 52 124.1-27 198.5-35.7c0 0 6.6-88.3-63.2-105.1m188.6 0c-53.1 12.4-64.1 54.1-65.2 105.1c26.5-.2 49.9 23.7 49.9 23.7s-27-98.6 15.3-128.8m-100.3 1.3h10c3 0 6 2.8 6 6.3c0 3.4-3 6.2-6 6.2h-10c-3 0-6-2.8-6-6.2c0-3.5 3-6.3 6-6.3m61.4 157.7c13.7 11.6 22.2 28.8 26.8 49.8c-15.8-12-35-16-57.1-14c-24.1 2-51.9 10-82.3 20l26.1-25c-28.3 14-53.1 17-75.4 12l80.9-40.2l-61.2 11.2c23.8-20.2 95.2-52.2 142.2-13.8"/>
    </svg>
  );
}

// fill="#12db8e"


function CNIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={className} viewBox="0 0 48 48" fill="currentColor">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3">
        <rect width="36" height="36" x="6" y="6" strokeLinejoin="round" rx="3"/>
        <path strokeLinejoin="round" d="M14 18h20v10H14z"/>
        <path d="M24 14v21"/>
      </g>
    </svg>
  );
}

function ENIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 10h2v.757a4.5 4.5 0 0 1 7 3.743V20h-2v-5.5c0-1.43-1.174-2.5-2.5-2.5S16 13.07 16 14.5V20h-2zm-2-6v2H4v5h8v2H4v5h8v2H2V4z"/>
    </svg>
  );
}

export { FoxIcon, CNIcon, ENIcon, LanguageIcon }
