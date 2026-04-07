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

  it("restores telex tone keys when the same tone key is pressed again", () => {
    expect(typeSequence("ass")).toBe("as");
    expect(typeSequence("hoass")).toBe("hoas");
    expect(applyTelexKey("á", "s")).toBe("as");
    expect(applyTelexKey("ấ", "s")).toBe("aas");
    expect(applyTelexKey("nguyễn", "x")).toBe("nguyeenx");
    expect(applyTelexKey("Á", "s")).toBe("AS");
    expect(applyVirtualKeyboardButton("á", "s")).toBe("as");
  });

  it("restores telex shape keys when the same transform key is pressed again", () => {
    expect(typeSequence("aaa")).toBe("aa");
    expect(applyTelexKey("â", "a")).toBe("aa");
    expect(applyTelexKey("ă", "w")).toBe("aw");
    expect(applyTelexKey("ê", "e")).toBe("ee");
    expect(applyTelexKey("ô", "o")).toBe("oo");
    expect(applyTelexKey("ư", "w")).toBe("uw");
    expect(applyTelexKey("đ", "d")).toBe("dd");
    expect(applyTelexKey("ấ", "a")).toBe("aas");
    expect(applyTelexKey("Đ", "d")).toBe("DD");
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
    expect(applyTelexKey("ấ", "z")).toBe("a");
    expect(applyTelexKey("nguyễn", "z")).toBe("nguyen");
    expect(applyTelexKey("Điện", "z")).toBe("Dien");
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

  it("simulates longer real-world typing flows close to Unikey", () => {
    expect(typeSequence("Tooi ddang gox tieesng Vieetj")).toBe("Tôi đang gõ tiếng Việt");
    expect(typeSequence("Nguyeenx Vaan A")).toBe("Nguyễn Vân A");
    expect(typeSequence("hoafng hown")).toBe("hoàng hơn");
    expect(typeSequence("DDieenj anhr Vieetj Nam")).toBe("Điện ảnh Việt Nam");
    expect(typeSequence("thuwowng hieeuj")).toBe("thương hiệu");
    expect(typeSequence("chuyeejn")).toBe("chuyện");
    expect(typeSequence("chuyeejnz")).toBe("chuyen");
    expect(typeSequence("nguyeenxx")).toBe("nguyeenx");
    expect(typeSequence("DDawng")).toBe("Đăng");
    expect(typeSequence("Tooiss")).toBe("Toois");
  });
});
