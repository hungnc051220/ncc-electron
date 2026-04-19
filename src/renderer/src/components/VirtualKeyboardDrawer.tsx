import { ChevronDown } from "lucide-react";
import Keyboard from "react-simple-keyboard";
import { createPortal } from "react-dom";
import "react-simple-keyboard/build/css/index.css";

type KeyboardInstance = {
  setInput: (input: string, inputName?: string) => void;
};

type VirtualKeyboardDrawerProps = {
  open: boolean;
  activeFieldLabel: string;
  layoutName: "default" | "shift";
  keyboardRef: (instance: KeyboardInstance | null) => void;
  onClose: () => void;
  onKeyPress: (button: string) => void;
};

const VirtualKeyboardDrawer = ({
  open,
  activeFieldLabel,
  layoutName,
  keyboardRef,
  onClose,
  onKeyPress
}: VirtualKeyboardDrawerProps) => {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className={`invoice-keyboard-drawer ${open ? "is-open" : ""}`}>
      <div className="invoice-keyboard-drawer__header">
        <div>
          <span className="invoice-keyboard-drawer__title">Bàn phím ảo</span>
          <p className="mt-1 mb-0 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {activeFieldLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="invoice-keyboard-drawer__close"
          aria-label="Đóng bàn phím ảo"
        >
          <ChevronDown size={18} />
        </button>
      </div>
      <Keyboard
        keyboardRef={keyboardRef}
        theme="hg-theme-default invoice-keyboard-theme"
        layoutName={layoutName}
        onKeyPress={onKeyPress}
        layout={{
          default: [
            "` 1 2 3 4 5 6 7 8 9 0 - = {bksp}",
            "{tab} q w e r t y u i o p [ ] \\",
            "{lock} a s d f g h j k l ; '",
            "{shift} z x c v b n m , . / {shift}",
            ".com @ {space} {enter}"
          ],
          shift: [
            "~ ! @ # $ % ^ & * ( ) _ + {bksp}",
            "{tab} Q W E R T Y U I O P { } |",
            '{lock} A S D F G H J K L : "',
            "{shift} Z X C V B N M < > ? {shift}",
            ".com @ {space} {enter}"
          ]
        }}
      />
    </div>,
    document.body
  );
};

export default VirtualKeyboardDrawer;
