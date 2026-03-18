import { describe, expect, it } from "vitest";
import {
  applyTelexKey,
  applyVirtualKeyboardButton,
  applyVirtualKeyboardInput
} from "./vietnameseTelex";

const typeSequence = (sequence: string) =>
  [...sequence].reduce((acc, key) => applyTelexKey(acc, key), "");

describe("vietnameseTelex", () => {
  it("converts aa to a-circumflex", () => {
    expect(applyTelexKey("a", "a")).toBe("â");
  });

  it("converts aw to breve a", () => {
    expect(applyTelexKey("a", "w")).toBe("ă");
  });

  it("converts dd to d-stroke", () => {
    expect(applyTelexKey("d", "d")).toBe("đ");
  });

  it("applies tone mark to the correct vowel", () => {
    expect(applyTelexKey("hoa", "s")).toBe("hóa");
    expect(applyTelexKey("huy", "r")).toBe("huỷ");
  });

  it("repositions tone correctly in compound Vietnamese words", () => {
    expect(typeSequence("hoafng")).toBe("hoàng");
    expect(typeSequence("hoangf")).toBe("hoàng");
    expect(typeSequence("nguyeenx")).toBe("nguyễn");
    expect(typeSequence("nguyeexn")).toBe("nguyễn");
    expect(typeSequence("Nguyeenx")).toBe("Nguyễn");
    expect(typeSequence("thuwowngj")).toBe("thượng");
    expect(typeSequence("tuees")).toBe("tuế");
    expect(typeSequence("thuees")).toBe("thuế");
    expect(typeSequence("truwowng")).toBe("trương");
    expect(typeSequence("chuyeejn")).toBe("chuyện");
  });

  it("removes marks with z", () => {
    expect(applyTelexKey("hóa", "z")).toBe("hoa");
    expect(applyTelexKey("đ", "z")).toBe("d");
  });

  it("processes appended virtual keyboard input", () => {
    expect(applyVirtualKeyboardInput("ho", "hoa")).toBe("hoa");
    expect(applyVirtualKeyboardInput("hoa", "hoas")).toBe("hóa");
  });

  it("keeps compound words correct when the keyboard emits raw telex history", () => {
    expect(applyVirtualKeyboardInput("nguyễ", "nguyeexn")).toBe("nguyễn");
    expect(applyVirtualKeyboardInput("hoàng", "hoangf ")).toBe("hoàng ");
    expect(applyVirtualKeyboardInput("hoàng", "hoafng ")).toBe("hoàng ");
  });

  it("applies virtual keyboard buttons from the current displayed value", () => {
    expect(applyVirtualKeyboardButton("nguyễ", "n")).toBe("nguyễn");
    expect(applyVirtualKeyboardButton("hoàng", "{space}")).toBe("hoàng ");
    expect(applyVirtualKeyboardButton("hoàng", "{bksp}")).toBe("hoàn");
  });
});
