import { Dimensions, requestAnimationFrame, resizeCanvas } from "./util"

type Particle = { positions: [number, number], velocity: [number, number], radius: number }

type Options = { numberOfParticles?: number, maxVelocity?: number, maxRadius?: number }

const randomParticles = (cnt: number, maxDim: Dimensions, maxVel: number, maxR: number): Generator<Particle, void> => (function*() {
  let i = 0;
  while (i < cnt) {
    yield randomParticle(maxDim, maxVel, maxR)
    i += 1;
  }
})()

const randomParticle = ([maxW, maxH]: Dimensions, maxVel: number, maxR: number): Particle => ({
  positions: [Math.random() * maxW, Math.random() * maxH,],
  velocity: [Math.random() * maxVel, Math.random() * maxVel],
  radius: Math.random() * maxR + 1
})

const updatedParticles = (particles: Array<Particle>, maxDim: Dimensions): Array<Particle> =>
  particles.map((p) => updatedParticle(p, maxDim))

const updatedParticle = (p: Particle, [maxW, maxH]: Dimensions): Particle => {
  const x = p.positions[0] + p.velocity[0], y = p.positions[1] + p.velocity[1]
  return {
    ...p,
    positions: [
      x < 0 ? maxW : (x > maxW ? 0 : x),
      y < 0 ? maxH : (y > maxH ? 0 : y),
    ]
  }
}

const particleRenderers = (particles: Array<Particle>): Array<(ctx: CanvasRenderingContext2D) => void> =>
  particles.map((p) => renderableParticle(p))

const renderableParticle = ({ positions: [x, y], radius }: Particle) => (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
}



export function main(options: Options = {}) {
  const cnvs = document.querySelector("[data-particles]") as HTMLCanvasElement
  if (!cnvs) return "no particles canvas element"
  const cnvsParent = cnvs.parentElement
  if (!cnvsParent) return "no canvas parent element"
  const cnvsContext = <CanvasRenderingContext2D>cnvs.getContext("2d")
  if (!cnvsContext) return "no canvas context"

  const { numberOfParticles = 50, maxVelocity = 1.11, maxRadius = 10 } = options

  const [cnvsWidth, cnvsHeight] = resizeCanvas(window, cnvsContext, cnvs, cnvsParent)

  const initParticles = Array.from(randomParticles(numberOfParticles, [cnvsWidth, cnvsHeight], maxVelocity, maxRadius))

  function loop(particles: Array<Particle>) {
    cnvsContext.clearRect(0, 0, cnvsWidth, cnvsHeight)

    const newParticles = updatedParticles(particles, [cnvsWidth, cnvsHeight])

    particleRenderers(particles).forEach((r) => r(cnvsContext))

    requestAnimationFrame(() => loop(newParticles))
  }

  loop(initParticles)
}

