// HDMI boxes cannot detect a physically rotated TV. Keep rotation explicit per URL.
export const getScheduleRotation = (search: string): 0 | 90 | 270 => {
  const match = /(?:^|[?&])rotate=(90|270)(?:&|$)/.exec(search);
  return match ? (Number(match[1]) as 90 | 270) : 0;
};

export const rotateScheduleCss = (css: string, width: number, height: number) =>
  css
    .replace(
      /(-?(?:\d*\.)?\d+)vw\b/g,
      (_match, value: string) => `${(Number(value) * width) / 100}px`
    )
    .replace(/@media\s*\(orientation:\s*(portrait|landscape)\)/g, (_match, orientation: string) =>
      (orientation === "portrait") === height > width ? "@media all" : "@media not all"
    );
