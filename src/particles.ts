type Dimensions = [number, number]

type Particle = { positions: [number, number], velocity: [number, number], radius: number }

type ParticlesOptions = { numberOfParticles?: number, maxVelocity?: number, maxRadius?: number }

const elementOffsetDimensions = (el: HTMLElement): Dimensions => [el.offsetWidth, el.offsetHeight]

const canvasDimensions = ([w, h]: Dimensions, dpr: number) => <Dimensions>[w * dpr, h * dpr]

const pixels = (num: number) => num + "px"

const animationLoop = (cb: () => boolean) => {
  const loop = () => {
    const stop = cb();
    if (stop) return
    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
};

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

const renderableParticles = (particles: Array<Particle>): Array<(ctx: CanvasRenderingContext2D) => void> =>
  particles.map((p) => renderableParticle(p))

const renderableParticle = ({ positions: [x, y], radius }: Particle) => (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
}



function particlesMain(options: ParticlesOptions = {}) {
  const cnvs = document.querySelector("[data-particles]") as HTMLCanvasElement
  if (!cnvs) return "no canvas element"
  const cnvsParent = cnvs.parentElement
  if (!cnvsParent) return "no canvas parent element"
  const cnvsContext = cnvs.getContext("2d")
  if (!cnvsContext) return "no canvas context"

  const { numberOfParticles = 50, maxVelocity = 1.11, maxRadius = 10 } = options


  const dpr = window.devicePixelRatio ?? 1

  const cnvsParrentOffsetDim: Dimensions = elementOffsetDimensions(cnvsParent)

  const [cnvsWidth, cnvsHeight] = canvasDimensions(cnvsParrentOffsetDim, dpr)

  cnvs.width = cnvsWidth
  cnvs.height = cnvsHeight

  cnvs.style.width = pixels(cnvsWidth)
  cnvs.style.height = pixels(cnvsHeight)

  cnvsContext.scale(dpr, dpr);

  let particles = Array.from(randomParticles(numberOfParticles, [cnvsWidth, cnvsHeight], maxVelocity, maxRadius))

  animationLoop(() => {
    cnvsContext.clearRect(0, 0, cnvsWidth, cnvsHeight)

    particles = updatedParticles(particles, [cnvsWidth, cnvsHeight])

    renderableParticles(particles).forEach((r) => r(cnvsContext))

    return false
  });

}
const particlesMainErr = particlesMain()
if (particlesMainErr)
  console.error("ERR: ", particlesMainErr)
