const paths = {
  train: 'M5 2h14a2 2 0 0 1 2 2v10a5 5 0 0 1-4 4l2 3h-3l-2-3h-4l-2 3H5l2-3a5 5 0 0 1-4-4V4a2 2 0 0 1 2-2Zm1 3v7h12V5H6Zm2 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm8 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  bus: 'M5 2h14a3 3 0 0 1 3 3v12a2 2 0 0 1-2 2h-1v3h-3v-3H8v3H5v-3H4a2 2 0 0 1-2-2V5a3 3 0 0 1 3-3Zm0 3v8h14V5H5Zm2 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  flight: 'm2 15 8-4V5.5C10 3 11 1 12 1s2 2 2 4.5V11l8 4v2l-8-2v4l3 2v2l-5-1-5 1v-2l3-2v-4l-8 2v-2Z',
  ferry: 'm12 2 3 4h4l2 8-9 5-9-5 2-8h4l3-4 3 4 3-4Zm-5 6-1 4h12l-1-4H7Zm-5 9c2 0 3 2 5 2s3-2 5-2 3 2 5 2 3-2 5-2v3c-2 0-3 2-5 2s-3-2-5-2-3 2-5 2-3-2-5-2-3 2-5 2v-3c2 0 3-2 5-2Z',
  swap: 'M7 7h11l-3-3 1.4-1.4L22 8l-5.6 5.4L15 12l3-3H7V7Zm10 10H6l3 3-1.4 1.4L2 16l5.6-5.4L9 12l-3 3h11v2Z',
  user: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5.3 0-9 2.7-9 6v2h18v-2c0-3.3-3.7-6-9-6Z',
  chevron: 'm7 9 5 5 5-5 1.4 1.4L12 16.8l-6.4-6.4L7 9Z',
  arrow: 'M5 11h11l-4-4 1.4-1.4L19.8 12l-6.4 6.4L12 17l4-4H5v-2Z',
  spark: 'm12 2 1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Zm7 12 .9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14Z',
  seat: 'M6 3h3v9h7V8h3v8H9v4H6V3Zm12 14h3v4h-3v-4Z',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 5v5.6l4 2.4-1 1.7-5-3V7h2Z',
  mapPin: 'M12 22s7-7.2 7-13A7 7 0 0 0 5 9c0 5.8 7 13 7 13Zm0-9a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z',
}

export default function Icon({ name, size = 24, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path fill="currentColor" d={paths[name] || paths.arrow} />
    </svg>
  )
}
