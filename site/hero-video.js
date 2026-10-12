const video = document.querySelector('[data-hero-video]')

if (video instanceof HTMLVideoElement) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  const syncPlayback = () => {
    video.autoplay = !reducedMotion.matches

    if (reducedMotion.matches) {
      video.pause()
      video.load()
      return
    }

    void video.play().catch(() => {})
  }

  syncPlayback()
  reducedMotion.addEventListener('change', syncPlayback)
}
