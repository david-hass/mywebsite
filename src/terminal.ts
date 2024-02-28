type EditorMode = "NORMAL" | "INSERT"

const NavigationKeyValues = ["h", "j", "k", "l"] as const;
type NavigationKey = (typeof NavigationKeyValues)[number];

type Char = string & { length: 1 }

type EditorAction =
  ["switch-mode", EditorMode]
  | ["navigate", NavigationKey]
  | ["input", Char]
  | ["no-action"]

function onNextKeydown(el: HTMLElement, cb: (e: KeyboardEvent) => void) {
  el.addEventListener('keydown', cb, { once: true });
}

const evaluateKeydown = (currentMode: EditorMode, { key }: KeyboardEvent): EditorAction => {

  switch (true) {
    case isEnterInsert(currentMode, key):
      return ["switch-mode", "INSERT"]
    case isEnterNormal(currentMode, key):
      return ["switch-mode", "NORMAL"]
    case isInput(currentMode, key):
      return ["input", key]
    case isNavigate(currentMode, key):
      return ["navigate", key]
  }
  return ["no-action"]
}

const isEnterInsert = (currentMode: EditorMode, key: string) =>
  currentMode !== "INSERT" && key === 'i'

const isEnterNormal = (currentMode: EditorMode, key: string) =>
  currentMode !== "NORMAL" && key === 'Escape'

const isNavigate = (currentMode: EditorMode, key: string): key is NavigationKey =>
  currentMode === "NORMAL" && key in NavigationKeyValues

const isInput = (currentMode: EditorMode, key: string): key is Char =>
  currentMode === "INSERT" && key.length === 1

const caretOffset = (window: Window, element: HTMLElement) => {
  let caretOffset = 0;

  const selection = window.getSelection()
  if (selection) {
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    caretOffset = preCaretRange.toString().length;
    return caretOffset;
  }
  return -1
}

const cursorPosition = (window: Window, tmnl: HTMLTextAreaElement): [number, number] => {
  const text = tmnl.innerText;
  const cursorPos = caretOffset(window, tmnl);
  const textBeforeCursor = text.substring(0, cursorPos);
  const row = (textBeforeCursor.match(/\n/g) || []).length + 1;
  const col = cursorPos - textBeforeCursor.lastIndexOf("\n");
  return [row, col]
}

function terminalMain(options = {}) {
  const tmnl = document.querySelector("[data-terminal]") as HTMLTextAreaElement
  if (!tmnl) return "no terminal element"
  const cursPosDisplay = document.querySelector("[data-cursor-position]") as HTMLSpanElement
  if (!cursPosDisplay) return "no cursor position display element"

  tmnl.addEventListener('keydown', (e) => e.preventDefault());
  loop("NORMAL", e)

  function loop(mode: EditorMode, event: KeyboardEvent) {

    const action = evaluateKeydown(mode, event)
    console.info(action)


    const [row, col] = cursorPosition(window, tmnl)
    cursPosDisplay.innerText = `${row}:${col}`

    onNextKeydown(tmnl, (e) => loop("NORMAL", e))
  }

}


const terminalMainErr = terminalMain()
if (terminalMainErr)
  console.error("ERR: ", terminalMainErr)


const y = `
          <div class="mt-4 grid grid-cols-12">
            <span class="text-green-400 col-span-1">8</span>
            <span class="pl-2 col-span-11"> apt-get hire me </span>
          </div>
`
