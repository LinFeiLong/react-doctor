const CURSOR_VIEWBOX_WIDTH = 19;
const CURSOR_VIEWBOX_HEIGHT = 26;

interface CursorProps {
  widthPx: number;
}

export const Cursor = ({ widthPx }: CursorProps) => {
  const heightPx = (widthPx * CURSOR_VIEWBOX_HEIGHT) / CURSOR_VIEWBOX_WIDTH;

  return (
    <svg
      width={widthPx}
      height={heightPx}
      viewBox="0 0 19 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g filter="url(#cursor_shadow)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M5.501 4.2601L13.884 12.6611C14.937 13.7171 14.19 15.5191 12.699 15.5191L11.475 15.519L12.6908 18.4067C12.9038 18.9127 12.9068 19.4727 12.6998 19.9817C12.4918 20.4917 12.0978 20.8897 11.5898 21.1027C11.3338 21.2097 11.0658 21.2637 10.7918 21.2637C9.9608 21.2637 9.2158 20.7687 8.8938 20.0027L7.616 16.965L6.784 17.7031C5.703 18.6591 4 17.8921 4 16.4481V4.8811C4 4.0971 4.947 3.7051 5.501 4.2601Z"
          fill="white"
        />
      </g>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.99951 5.5292C4.99951 5.3982 5.15851 5.3322 5.25051 5.4252L13.1585 13.3502C13.5895 13.7822 13.2835 14.5192 12.6735 14.5192L9.96951 14.5177L11.7691 18.7936C11.9961 19.3336 11.7421 19.9546 11.2031 20.1806C10.6621 20.4076 10.0421 20.1546 9.81611 19.6156L7.99851 15.2917L6.13851 16.9392C5.72251 17.3072 5.08063 17.0507 5.00655 16.5274L4.99951 16.4262V5.5292Z"
        fill="black"
      />
      <defs>
        <filter
          id="cursor_shadow"
          x="0"
          y="0"
          width="18.3766"
          height="25.2637"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </filter>
      </defs>
    </svg>
  );
};
