import { main as pmain } from './particles'
const particlesErr = pmain()
if (particlesErr)
  console.error("ERR: ", particlesErr)

import { main as tmain } from './terminal'
const terminalErr = tmain()
if (terminalErr)
  console.error("ERR: ", terminalErr)
