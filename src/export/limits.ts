/** Ermittelt, wie groß der Browser Bilder rendern kann. */

let gpuMaxCache: number | null = null;

/** Größte Kantenlänge, die WebGL als Zeichenfläche erlaubt. */
export function gpuMaxSize(): number {
  if (gpuMaxCache) return gpuMaxCache;
  let max = 4096;
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (gl) {
      const dims = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
      max = Math.min(
        gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
        gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number,
        dims[0],
        dims[1],
      );
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    /* Standardwert verwenden */
  }
  gpuMaxCache = max;
  return max;
}

function isSafariLike(): boolean {
  const ua = navigator.userAgent;
  const iOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return iOS || (/Safari/.test(ua) && !/Chrome|Chromium|Android|Edg/.test(ua));
}

function isMobile(): boolean {
  return window.matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 900;
}

/** Maximale Pixelzahl einer 2D-Canvas (konservativ, um Abstürze zu vermeiden). */
export function maxCanvasArea(): number {
  if (isSafariLike()) return 16_777_216; // harte WebKit-Grenze (4096²)
  if (isMobile()) return 60_000_000;
  return 200_000_000;
}

export function maxCanvasDimension(): number {
  return isSafariLike() ? 16_384 : 32_767;
}
