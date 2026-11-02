import type { PaperVoucherBatch } from "@shared/types";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { paperVoucherMockRepository } from "../paperVoucher.mock";
import {
  createImageFile,
  getButtonByText,
  PaperVoucherTestProviders,
  selectImageFile,
  stubObjectUrls
} from "../paperVoucher.testUtils";
import { PAPER_VOUCHER_MAX_IMAGES, PAPER_VOUCHER_TOO_MANY_IMAGES_MESSAGE } from "../paperVoucher.utils";
import PaperVoucherBatchDialog from "./PaperVoucherBatchDialog";

const renderDialog = ({
  editingBatch = null,
  canSubmit = true
}: { editingBatch?: PaperVoucherBatch | null; canSubmit?: boolean } = {}) => {
  const onOpenChange = vi.fn();

  render(
    <PaperVoucherTestProviders>
      <PaperVoucherBatchDialog
        open
        onOpenChange={onOpenChange}
        editingBatch={editingBatch}
        canSubmit={canSubmit}
      />
    </PaperVoucherTestProviders>
  );

  const dialog = screen
    .getByText(editingBatch ? "Chỉnh sửa lô voucher giấy" : "Tạo lô voucher giấy")
    .closest<HTMLElement>(".ant-modal");
  if (!dialog) throw new Error("Không tìm thấy modal");
  return { dialog, onOpenChange };
};

const getImageSection = (dialog: HTMLElement) => {
  const section = dialog.querySelector<HTMLElement>("section[aria-label='Hình ảnh voucher']");
  if (!section) throw new Error("Không tìm thấy vùng hình ảnh voucher");
  return section;
};

/** Tên file của các ảnh trong form, theo thứ tự đang hiển thị. */
const getImageNames = (dialog: HTMLElement) =>
  within(getImageSection(dialog))
    .queryAllByTestId("paper-voucher-image-item")
    .map((item) => item.querySelector("span[title]")?.getAttribute("title"));

const getBatch = async (id: number) => {
  const batch = (await paperVoucherMockRepository.list()).find((item) => item.id === id);
  if (!batch) throw new Error(`Không tìm thấy lô ${id}`);
  return batch;
};

const toDto = (batch: PaperVoucherBatch) => ({
  name: batch.name,
  faceValue: batch.faceValue,
  totalQuantity: batch.totalQuantity,
  validFrom: batch.validFrom,
  expiresAt: batch.expiresAt,
  note: batch.note
});

const withImages = async (id: number, names: string[]) =>
  paperVoucherMockRepository.update({
    id,
    dto: { ...toDto(await getBatch(id)), images: names.map((name) => ({ file: createImageFile(name) })) }
  });

describe("PaperVoucherBatchDialog images", () => {
  let urls: ReturnType<typeof stubObjectUrls>;

  beforeEach(() => {
    // Reset trước khi stub để URL của test trước không bị ghi nhận vào spy mới.
    paperVoucherMockRepository.reset();
    urls = stubObjectUrls();
  });

  it("adds several images in one selection and saves them in the chosen order", async () => {
    const { dialog, onOpenChange } = renderDialog({ editingBatch: await getBatch(4) });

    selectImageFile(
      getImageSection(dialog),
      createImageFile("a.png"),
      createImageFile("b.webp", "image/webp"),
      createImageFile("c.jpg", "image/jpeg")
    );
    expect(await within(dialog).findByAltText("Ảnh 3 voucher")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByLabelText("Đưa ảnh 3 lên trước"));
    expect(getImageNames(dialog)).toEqual(["a.png", "c.jpg", "b.webp"]);

    fireEvent.click(getButtonByText(dialog, "Lưu thay đổi"));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    const saved = await getBatch(4);
    expect(saved.images?.map((image) => image.fileName)).toEqual(["a.png", "c.jpg", "b.webp"]);
    expect(saved.images?.every((image) => image.url.startsWith("blob:"))).toBe(true);
  });

  it("removes a selected image and revokes its preview", async () => {
    const { dialog } = renderDialog();

    selectImageFile(getImageSection(dialog), createImageFile("cu.png"), createImageFile("moi.png"));
    const firstPreview = await within(dialog).findByAltText("Ảnh 1 voucher");
    const firstUrl = firstPreview.getAttribute("src");

    fireEvent.click(within(dialog).getByLabelText("Xóa ảnh 1"));

    expect(getImageNames(dialog)).toEqual(["moi.png"]);
    expect(urls.revokeObjectURL).toHaveBeenCalledWith(firstUrl);
  });

  it("rejects wrong formats and files larger than 5 MB but keeps the valid ones", async () => {
    const { dialog } = renderDialog();

    selectImageFile(
      getImageSection(dialog),
      createImageFile("anh.gif", "image/gif"),
      createImageFile("lon.png", "image/png", 5 * 1024 * 1024 + 1),
      createImageFile("dung.png")
    );

    expect(await screen.findByText("anh.gif: Chỉ chấp nhận ảnh JPG, PNG hoặc WebP")).toBeInTheDocument();
    expect(await screen.findByText("lon.png: Ảnh phải có dung lượng tối đa 5 MB")).toBeInTheDocument();
    expect(getImageNames(dialog)).toEqual(["dung.png"]);
    expect(urls.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it(`accepts at most ${PAPER_VOUCHER_MAX_IMAGES} images and hides the add button when full`, async () => {
    const { dialog } = renderDialog();
    const files = Array.from({ length: PAPER_VOUCHER_MAX_IMAGES + 2 }, (_, index) =>
      createImageFile(`${index + 1}.png`)
    );

    selectImageFile(getImageSection(dialog), ...files);

    expect(await screen.findByText(PAPER_VOUCHER_TOO_MANY_IMAGES_MESSAGE)).toBeInTheDocument();
    expect(getImageNames(dialog)).toHaveLength(PAPER_VOUCHER_MAX_IMAGES);
    expect(within(dialog).queryByLabelText("Thêm ảnh voucher")).not.toBeInTheDocument();
  });

  it("does not save image changes when the dialog is cancelled", async () => {
    const original = await withImages(4, ["goc.png", "phu.png"]);
    const { dialog, onOpenChange } = renderDialog({ editingBatch: original });

    fireEvent.click(within(dialog).getByLabelText("Xóa ảnh 1"));
    selectImageFile(getImageSection(dialog), createImageFile("them.png"));
    await within(dialog).findByAltText("Ảnh 2 voucher");

    fireEvent.click(getButtonByText(dialog, /^(Hủy|Cancel)$/));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect((await getBatch(4)).images).toEqual(original.images);
  });

  it("keeps existing images when only other fields are edited", async () => {
    const original = await withImages(3, ["sau.png"]);
    const { dialog, onOpenChange } = renderDialog({ editingBatch: original });

    expect(within(dialog).getByAltText("Ảnh 1 voucher")).toHaveAttribute(
      "src",
      original.images?.[0].url
    );

    fireEvent.change(within(dialog).getByLabelText("Tên lô"), {
      target: { value: "Voucher giấy 100K - đổi tên" }
    });
    fireEvent.click(getButtonByText(dialog, "Lưu thay đổi"));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    const stored = await getBatch(3);
    expect(stored.name).toBe("Voucher giấy 100K - đổi tên");
    expect(stored.images).toEqual(original.images);
    expect(urls.revokeObjectURL).not.toHaveBeenCalledWith(original.images?.[0].url);
  });

  it("disables image changes without create/update permission", async () => {
    const original = await withImages(4, ["goc.png"]);
    const { dialog } = renderDialog({ editingBatch: original, canSubmit: false });

    expect(within(dialog).getByAltText("Ảnh 1 voucher")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Xóa ảnh 1")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Thêm ảnh voucher")).not.toBeInTheDocument();
    expect(getButtonByText(dialog, "Lưu thay đổi")).toBeDisabled();
  });
});
