import { applyVirtualKeyboardButton } from "@renderer/lib/vietnameseTelex";
import { Form } from "antd";
import type { FormInstance } from "antd";
import type { ChangeEvent, FocusEvent } from "react";
import { useMemo, useRef, useState } from "react";

type KeyboardInstance = {
  setInput: (input: string, inputName?: string) => void;
};

type FocusableElement = {
  focus: () => void;
};

type KeyboardBindingOptions = {
  disabled?: boolean;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
};

type UseVirtualKeyboardOptions<Field extends string> = {
  enabled?: boolean;
  fields: readonly Field[];
  form: FormInstance;
  labels: Record<Field, string>;
  onEnter?: () => void;
};

export const useVirtualKeyboard = <Field extends string>({
  enabled = true,
  fields,
  form,
  labels,
  onEnter
}: UseVirtualKeyboardOptions<Field>) => {
  const watchedValues = (Form.useWatch([], form) ?? {}) as Partial<Record<Field, unknown>>;
  const keyboardRef = useRef<KeyboardInstance | null>(null);
  const inputRefs = useRef(new Map<Field, FocusableElement>());
  const [activeField, setActiveField] = useState<Field>(fields[0]);
  const [layoutName, setLayoutName] = useState<"default" | "shift">("default");
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const fieldSet = useMemo(() => new Set(fields), [fields]);

  const getFieldValue = (field: Field) => {
    const value = watchedValues[field];

    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);

    return "";
  };

  const updateFieldValue = (field: Field, value: string) => {
    form.setFieldValue(field, value);
    keyboardRef.current?.setInput(value, String(field));
  };

  const openKeyboard = (field: Field) => {
    if (!enabled || !fieldSet.has(field)) return;

    setActiveField(field);
    setIsKeyboardOpen(true);
    keyboardRef.current?.setInput(getFieldValue(field), String(field));
  };

  const bindInput = (field: Field, options?: KeyboardBindingOptions) => ({
    value: getFieldValue(field),
    onFocus: (event: FocusEvent<HTMLElement>) => {
      options?.onFocus?.(event);

      if (options?.disabled) return;
      openKeyboard(field);
    },
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateFieldValue(field, event.target.value);
    },
    ref: (node: FocusableElement | null) => {
      if (node) {
        inputRefs.current.set(field, node);
      } else {
        inputRefs.current.delete(field);
      }
    }
  });

  const handleKeyPress = (button: string) => {
    if (button === "{shift}" || button === "{lock}") {
      setLayoutName((current) => (current === "default" ? "shift" : "default"));
      return;
    }

    if (button === "{tab}") {
      const currentIndex = fields.indexOf(activeField);
      const nextField = fields[currentIndex >= 0 ? (currentIndex + 1) % fields.length : 0];

      setActiveField(nextField);
      window.setTimeout(() => {
        inputRefs.current.get(nextField)?.focus();
      }, 0);
      return;
    }

    if (button === "{enter}") {
      onEnter?.();
      return;
    }

    updateFieldValue(activeField, applyVirtualKeyboardButton(getFieldValue(activeField), button));
  };

  return {
    activeField,
    activeFieldLabel: labels[activeField],
    bindInput,
    handleKeyPress,
    isKeyboardOpen,
    layoutName,
    openKeyboard,
    registerKeyboard: (instance: KeyboardInstance | null) => {
      keyboardRef.current = instance;
    },
    setIsKeyboardOpen
  };
};
