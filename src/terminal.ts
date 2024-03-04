
type Options = {
  lineHeight?: number
  , rowStart?: number
  , textColor?: string
  , caretColor?: string
  , caretCharColor?: string
}

type EditorState = { mode: EditorMode, caretPos: CaretPosition, content: string[] }

type EditorMode = "normal" | "insert"

type EditorNavigation =
  ["step-right", number]
  | ["step-left", number]
  | ["row-down", number]
  | ["row-up", number]

type CaretPosition = [number, number]

const NavigationKeyValues = ["h", "j", "k", "l"] as const;
type NavigationKey = (typeof NavigationKeyValues)[number];

type Char = string & { length: 1 }

type EditorAction =
  ["switch-mode", EditorMode]
  | ["navigate", EditorNavigation]
  | ["input", Char]
  | ["no-action"]

function onNextKeydown(el: HTMLElement, cb: (e: KeyboardEvent) => void) {
  el.addEventListener('keydown', cb, { once: true });
}

const evaluatedKeydown = ({ mode }: EditorState, { key: _key }: KeyboardEvent): EditorAction => {
  const key = <Char>_key
  switch (true) {
    case isEnterInsert(mode, key):
      return ["switch-mode", "insert"]
    case isEnterNormal(mode, key):
      return ["switch-mode", "normal"]
    case isInput(mode, key):
      return ["input", key]
    case isNavigate(mode, key):
      return ["navigate", navigation(key)]
  }
  return ["no-action"]
}

const isEnterInsert = (currentMode: EditorMode, key: Char) =>
  currentMode !== "insert" && key === 'i'

const isEnterNormal = (currentMode: EditorMode, key: Char) =>
  currentMode !== "normal" && key === 'Escape'

const isNavigate = (currentMode: EditorMode, key: string): key is NavigationKey =>
  currentMode === "normal" && NavigationKeyValues.some(e => e === key)

const navigation = (key: NavigationKey): EditorNavigation => {
  switch (key) {
    case "h":
      return ["step-left", 1]
    case "j":
      return ["row-down", 1]
    case "k":
      return ["row-up", 1]
    case "l":
      return ["step-right", 1]
  }
}

const isInput = (currentMode: EditorMode, key: Char) =>
  currentMode === "insert" && /^[a-z0-9]$/i.test(key)

const evaluatedAction = (state: EditorState, action: EditorAction): EditorState => {
  const [actionType] = action
  switch (actionType) {
    case "switch-mode": {
      const [, newMode] = action
      return { ...state, mode: newMode }
    }
    case "input": {
      const [, char] = action
      const [rowIndex, charIndex] = state.caretPos
      const newContent = state.content
        .map((r, i) => i === rowIndex ? `${r.slice(0, charIndex)}${char}${r.slice(charIndex)}` : r)
      return { ...state, content: newContent }
    }
    case "navigate": {
      const [, key] = action
      const newPos = updatedCaretPosition(state, key)
      return { ...state, caretPos: newPos }
    }
    case "no-action":
      return state
  }

}

const updatedCaretPosition = (state: EditorState, [navType, amount]: EditorNavigation): CaretPosition => {
  const [rowIndex, charIndex] = state.caretPos
  switch (navType) {
    case "step-left":
      {
        return [rowIndex, (charIndex - amount) >= 0 ? charIndex - amount : charIndex]
      }
    case "row-down":
      {
        const maxRow = state.content.length - 1
        const newRowIndex = rowIndex + amount
        if (newRowIndex <= maxRow) {
          const clampedCharIndex = Math.min(charIndex, state.content[newRowIndex].length - 1)
          return [newRowIndex, clampedCharIndex]
        }
        return [rowIndex, charIndex]
      }
    case "row-up":
      {
        const newRowIndex = rowIndex - amount
        if (newRowIndex >= 0) {
          const clampedCharIndex = Math.min(charIndex, state.content[newRowIndex].length - 1)
          return [newRowIndex, clampedCharIndex]
        }
        return [rowIndex, charIndex]
      }
    case "step-right":
      {
        const maxCharIndex = state.content[rowIndex].length - 1
        return [rowIndex, (charIndex + amount) <= maxCharIndex ? charIndex + amount : charIndex]
      }
  }
}

const rowRenderers = (rows: string[], options: Required<Options>): Array<(ctx: CanvasRenderingContext2D) => void> =>
  rows.map((row, rowIndex) => (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = options.textColor;
    ctx.fillText(row, options.rowStart, (options.lineHeight * (rowIndex + 1)));
  })

const caretRenderer = (rows: string[], [caretRowI, caretCharI]: CaretPosition, options: Required<Options>): (ctx: CanvasRenderingContext2D) => void =>
  (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = options.textColor;
    const { width: textWidth } = ctx.measureText(rows[caretRowI].slice(0, caretCharI))
    const caretX = options.rowStart + textWidth;
    const caretY = options.lineHeight * caretRowI;
    const { width: charWidth } = ctx.measureText(rows[caretRowI][caretCharI])
    ctx.fillRect(caretX, caretY, charWidth, options.lineHeight);
  }

const caretRowRenderer = (rows: string[], [caretRowI, caretCharI]: CaretPosition, options: Required<Options>): (ctx: CanvasRenderingContext2D) => void =>
  (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = options.textColor;
    const caretRow = rows[caretRowI]
    const caretRowBeforeCaret = cursorRow.slice(0, caretCharI)
    const caretCharacter = caretRow[caretCharI]
    const caretRowAfterCaret = cursorRow.slice(caretCharI + 1)
    ctx.fillText(firstCursorRowPart, options.rowStart, (options.lineHeight * (caretRowIndex + 1)));
    ctx.fillStyle = caretCharFillStyle;
    ctx.fillText(cursorCharacter
      , options.rowStart + ctx.measureText(firstCursorRowPart).width
      , (options.lineHeight * (caretRowI + 1)));
    ctx.fillStyle = options.textColor;
    ctx.fillText(secondCursorRowPart
      , options.rowStart + ctx.measureText(firstCursorRowPart).width + cnvsContext.measureText(cursorCharacter).width
      , (options.lineHeight * (caretRowI + 1)));

  }









export function main(options: Options = { lineHeight: 20, rowStart: 5 }) {
  const cnvs = document.querySelector("[data-terminal]") as HTMLCanvasElement
  if (!cnvs) return "no terminal element"
  cnvs.addEventListener('keydown', (e) => e.preventDefault());
  cnvs.focus()
  const modeEl = document.querySelector("[data-editor-mode]") as HTMLSpanElement
  if (!modeEl) return "no editor mode element"
  const posEl = document.querySelector("[data-cursor-position]") as HTMLSpanElement
  if (!posEl) return "no cursor position element"
  const cnvsContext = <CanvasRenderingContext2D>cnvs.getContext("2d")
  if (!cnvsContext) return "no canvas context"

  cnvsContext.font = '20px Arial';

  const initState: EditorState = { mode: "normal", caretPos: [2, 1], content: ["xxxxx", "aaaaaaaaaa", "bbbbbbb", "cccc"] }

  modeEl.innerText = initState.mode
  posEl.innerText = `${initState.caretPos[0]}:${initState.caretPos[1]}`

  function loop(state: EditorState, event: KeyboardEvent, options: Required<Options>) {

    const action = evaluatedKeydown(state, event)

    const newState = evaluatedAction(state, action)

    onNextKeydown(cnvs, (e) => loop(newState, e, options));


    cnvsContext.clearRect(0, 0, cnvs.width, cnvs.height);

    rowRenderers(newState.content, options.rowStart, options.lineHeight).forEach(r => r(cnvsContext))

    caretRenderer(newState.content, newState.caretPos, options.rowStart, options.lineHeight)(cnvsContext)
    modeEl.innerText = newState.mode.toUpperCase()
    posEl.innerText = `${caretRowIndex + 1}:${caretCharIndex + 1}`

  }

  loop(initState, new KeyboardEvent('init'), <Required<Options>>options)
}




