export type Dimensions = [number, number]

export const requestAnimationFrame =
  window.requestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.msRequestAnimationFrame;

export const cancelAnimationFrame =
  window.cancelAnimationFrame || window.mozCancelAnimationFrame;

export function resizeCanvas(window: Window, ctx: CanvasRenderingContext2D, cnvsEl: HTMLCanvasElement, cnvsParentEl: HTMLElement) {
  const dpr = window.devicePixelRatio ?? 1

  const cnvsParrentOffsetDim: Dimensions = elementOffsetDimensions(cnvsParentEl)

  const [cnvsWidth, cnvsHeight] = canvasDimensions(cnvsParrentOffsetDim, dpr)

  cnvsEl.width = cnvsWidth
  cnvsEl.height = cnvsHeight

  cnvsEl.style.width = pixels(cnvsWidth)
  cnvsEl.style.height = pixels(cnvsHeight)

  ctx.scale(dpr, dpr);

  return [cnvsWidth, cnvsHeight]
}

export const elementOffsetDimensions = (el: HTMLElement): Dimensions => [el.offsetWidth, el.offsetHeight]

export const canvasDimensions = ([w, h]: Dimensions, dpr: number) => <Dimensions>[w * dpr, h * dpr]

export const pixels = (num: number) => num + "px"



