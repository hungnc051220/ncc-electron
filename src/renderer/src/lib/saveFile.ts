export type SaveFileResult = {
  canceled: boolean;
  filePath?: string;
};

export const saveExcelFile = async (
  content: Uint8Array,
  defaultFileName: string
): Promise<SaveFileResult> => {
  return window.api.saveFile({
    defaultFileName,
    content,
    filters: [{ name: "Excel", extensions: ["xlsx"] }]
  });
};
