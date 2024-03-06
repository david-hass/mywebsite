//TODO es wäre vlt besser den caret "zurück zu zeichnen" 
// empty rows handlen

import { resizeCanvas } from "./util"

type Options = {
  lineHeight?: number
  , rowStart?: number
  , textColor?: string
  , caretColor?: string
  , caretCharColor?: string
}

type EditorState = { mode: EditorMode, caretPos: Position, content: string[] }

type EditorMode = "normal" | "insert"

type EditorNavigation =
  ["step-right", number]
  | ["step-left", number]
  | ["row-down", number]
  | ["row-up", number]

type Position = [rowIndex: number, charIndex: number]

const NavigationKeyValues = ["h", "j", "k", "l"] as const;
type NavigationKey = (typeof NavigationKeyValues)[number];

type Index = number

type Char = string & { length: 1 }

type EditorAction =
  ["switch-mode", EditorMode]
  | ["navigate", EditorNavigation]
  | ["add-char", Char, Position]
  | ["remove-char", Char, Position]
  | ["add-row", Index]
  | ["remove-row", Index]
  | ["no-action"]
  | ["batch", EditorAction[]]

function onNextKeydown(el: HTMLElement, cb: (e: KeyboardEvent) => void) {
  el.addEventListener('keydown', cb, { once: true });
}

const evaluatedKeydown = ({ mode, caretPos: [caretRowI, caretCharI] }: EditorState, { key: _key }: KeyboardEvent): EditorAction => {
  const key = <Char>_key
  switch (true) {
    case isEnterInsertFromNormal(mode, key):
      return ["switch-mode", "insert"]
    case isEnterNormalFromInsert(mode, key):
      return ["batch", [["switch-mode", "normal"], ["navigate", ["step-left", 1]]]]
    case isWriteCharacter(mode, key):
      return ["batch", [["add-char", key, [caretRowI, caretCharI]], ["navigate", ["step-right", 1]]]]
    // case isRemoveCharacter(mode, key):
    //   return ["remove-char", [caretRowI, caretCharI]]
    case isAddEmptyRowAbove(mode, key):
      return ["batch", [
        ["add-row", caretRowI]
        , ["navigate", ["step-left", caretCharI]]
        , ["switch-mode", "insert"]
      ]]
    case isAddEmptyRowBelow(mode, key):
      return ["batch", [
        ["add-row", caretRowI + 1]
        , ["navigate", ["step-left", caretCharI]]
        , ["navigate", ["row-down", 1]]
        , ["switch-mode", "insert"]
      ]]
    case isNavigate(mode, key):
      return ["navigate", navigation(key)]
    case isAppend(mode, key):
      return ["batch", [["switch-mode", "insert"], ["navigate", ["step-right", 1]]]]
  }
  return ["no-action"]
}

const isEnterInsertFromNormal = (currentMode: EditorMode, key: Char) =>
  currentMode === "normal" && key === 'i'

const isEnterNormalFromInsert = (currentMode: EditorMode, key: Char) =>
  currentMode === "insert" && key === 'Escape'

const isNavigate = (currentMode: EditorMode, key: string): key is NavigationKey =>
  currentMode === "normal" && NavigationKeyValues.some(e => e === key)

const isAppend = (currentMode: EditorMode, key: string): key is NavigationKey =>
  currentMode === "normal" && key === "a"

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

const isWriteCharacter = (currentMode: EditorMode, key: Char) =>
  currentMode === "insert" && /^[a-z0-9]$/i.test(key)

const isAddEmptyRowAbove = (currentMode: EditorMode, key: Char) =>
  currentMode === "normal" && key === "O"

const isAddEmptyRowBelow = (currentMode: EditorMode, key: Char) =>
  currentMode === "normal" && key === "o"

const evaluatedAction = (state: EditorState, action: EditorAction): EditorState => {
  const [actionType] = action
  switch (actionType) {
    case "switch-mode": {
      const [, newMode] = action
      return { ...state, mode: newMode }
    }
    case "add-char": {
      const [, char] = action
      const [rowIndex, charIndex] = state.caretPos
      const newContent = state.content
        .map((r, i) => i === rowIndex ? `${r.slice(0, charIndex)}${char}${r.slice(charIndex)}` : r)
      return { ...state, content: newContent }
    }
    case "add-row": {
      const [, addIndex] = action
      const newContent = state.content.slice(0, addIndex).concat("").concat(state.content.slice(addIndex))
      return { ...state, content: newContent }
    }
    case "navigate": {
      const [, navigation] = action
      const newPos = updatedCaretPosition(state, navigation)
      return { ...state, caretPos: newPos }
    }
    case "no-action":
      return state
    case "batch":
      {
        const [, actions] = action
        if (actions?.length === 0) return state
        const [_action, ...remaining] = actions
        const newState = evaluatedAction(state, _action)
        return evaluatedAction(newState, ["batch", remaining])
      }
  }

}

const updatedCaretPosition = (state: EditorState, [navType, amount]: EditorNavigation): Position => {
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
          const clampedCharIndex = Math.max(Math.min(charIndex, state.content[newRowIndex].length - 1), 0)
          return [newRowIndex, clampedCharIndex]
        }
        return [rowIndex, charIndex]
      }
    case "row-up":
      {
        const newRowIndex = rowIndex - amount
        if (newRowIndex >= 0) {
          const clampedCharIndex = Math.max(Math.min(charIndex, state.content[newRowIndex].length - 1), 0)
          return [newRowIndex, clampedCharIndex]
        }
        return [rowIndex, charIndex]
      }
    case "step-right":
      {
        const maxCharIndex = maxCharacterIndex(state.content[rowIndex].length, state.mode)
        return [rowIndex, (charIndex + amount) <= maxCharIndex ? charIndex + amount : charIndex]
      }
  }
}

const maxCharacterIndex = (rowLength: number, mode: EditorMode) => rowLength - (mode === "normal" ? 1 : 0)

const rowRenderers = (rows: string[], options: Required<Options>): Array<(ctx: CanvasRenderingContext2D) => void> =>
  rows.map((row, rowIndex) => (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = options.textColor;
    ctx.fillText(row, options.rowStart, (options.lineHeight * (rowIndex + 1)));
  })

const normalCaretRenderer = (rows: string[], [caretRowI, caretCharI]: Position, options: Required<Options>): (ctx: CanvasRenderingContext2D) => void =>
  (ctx: CanvasRenderingContext2D) => {
    const caretWidth = ctx.measureText(rows[caretRowI][caretCharI] ?? "x").width
    return caretRenderer(rows, caretWidth, [caretRowI, caretCharI], options)(ctx)
  }

const insertCaretRenderer =
  (rows: string[], caretPos: Position, options: Required<Options>): (ctx: CanvasRenderingContext2D) => void =>
    (ctx: CanvasRenderingContext2D) => caretRenderer(rows, 2, caretPos, options)(ctx)

const caretRenderer = (rows: string[], caretWidth: number, [caretRowI, caretCharI]: Position, options: Required<Options>): (ctx: CanvasRenderingContext2D) => void =>
  (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = options.textColor;
    const { width: textWidth } = ctx.measureText(rows[caretRowI].slice(0, caretCharI))
    const caretX = options.rowStart + textWidth;
    const caretY = options.lineHeight * caretRowI;
    ctx.fillRect(caretX, caretY, caretWidth, options.lineHeight);
  }

const caretRowRenderer = (rows: string[], [caretRowI, caretCharI]: Position, options: Required<Options>): (ctx: CanvasRenderingContext2D) => void =>
  (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = options.textColor;
    const caretRow = rows[caretRowI]
    if (!caretRow)
      return
    const caretRowBeforeCaret = caretRow.slice(0, caretCharI)
    const caretCharacter = caretRow[caretCharI]
    const caretRowAfterCaret = caretRow.slice(caretCharI + 1)
    ctx.fillText(caretRowBeforeCaret, options.rowStart, (options.lineHeight * (caretRowI + 1)));
    ctx.fillStyle = options.caretCharColor;
    ctx.fillText(caretCharacter
      , options.rowStart + ctx.measureText(caretRowBeforeCaret).width
      , (options.lineHeight * (caretRowI + 1)));
    ctx.fillStyle = options.textColor;
    ctx.fillText(caretRowAfterCaret
      , options.rowStart
      + ctx.measureText(caretRowBeforeCaret).width
      + ctx.measureText(caretCharacter).width
      , (options.lineHeight * (caretRowI + 1)));

  }

export function main(options: Options = {
  lineHeight: 20, rowStart: 5, textColor: "white", caretColor: "white", caretCharColor: "grey"

}) {
  const cnvs = document.querySelector("[data-terminal]") as HTMLCanvasElement
  if (!cnvs) return "no terminal element"
  const cnvsParent = cnvs.parentElement
  if (!cnvsParent) return "no canvas parent element"
  const modeEl = document.querySelector("[data-editor-mode]") as HTMLSpanElement
  if (!modeEl) return "no editor mode element"
  const posEl = document.querySelector("[data-cursor-position]") as HTMLSpanElement
  if (!posEl) return "no cursor position element"
  const cnvsContext = <CanvasRenderingContext2D>cnvs.getContext("2d")
  if (!cnvsContext) return "no canvas context"

  const [cnvsWidth, cnvsHeight] = resizeCanvas(window, cnvsContext, cnvs, cnvsParent)

  cnvsContext.font = '20px Arial';
  cnvs.addEventListener('keydown', (e) => e.preventDefault());
  cnvs.focus()

  const initState: EditorState = { mode: "normal", caretPos: [2, 1], content: ["xxxxx", "aaaaaaaaaa", "bbbbbbb", "cccc"] }
  modeEl.innerText = initState.mode
  posEl.innerText = `${initState.caretPos[0]}:${initState.caretPos[1]}`

  function loop(state: EditorState, event: KeyboardEvent, options: Required<Options>) {
    const action = evaluatedKeydown(state, event)

    const newState = evaluatedAction(state, action)

    onNextKeydown(cnvs, (e) => loop(newState, e, options));

    cnvsContext.clearRect(0, 0, cnvsWidth, cnvsHeight);

    rowRenderers(newState.content, options).forEach(r => r(cnvsContext))

    if (newState.mode === "normal") {
      normalCaretRenderer(newState.content, newState.caretPos, options)(cnvsContext)
      caretRowRenderer(newState.content, newState.caretPos, options)(cnvsContext)
    }
    else if (newState.mode === "insert") {
      insertCaretRenderer(newState.content, newState.caretPos, options)(cnvsContext)
    }

    modeEl.innerText = newState.mode.toUpperCase()
    posEl.innerText = `${newState.caretPos[0] + 1}:${newState.caretPos[1] + 1}`
  }

  loop(initState, new KeyboardEvent('init'), <Required<Options>>options)
}




