export type SaveFileResult = {
  canceled: boolean;
  filePath?: string;
};

export const saveExcelFile = async (
  content: Uint8Array,
  defaultFileName: string
): Promise<SaveFileResult> => {
  try {
    return await window.api.saveFile({
      defaultFileName,
      content,
      filters: [{ name: "Excel", extensions: ["xlsx"] }]
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const friendlyMessage = rawMessage
      .replace(/^Error invoking remote method 'save-file':\s*/i, "")
      .replace(/^Error:\s*/i, "")
      .trim();

    throw new Error(friendlyMessage || "Không thể lưu file. Vui lòng thử lại.");
  }
};
