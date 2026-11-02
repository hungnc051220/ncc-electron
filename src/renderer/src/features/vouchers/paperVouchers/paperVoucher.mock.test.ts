import { describe, expect, it } from "vitest";
import { createPaperVoucherMockRepository, PAPER_VOUCHER_SEED } from "./paperVoucher.mock";
import { createImageFile, stubObjectUrls } from "./paperVoucher.testUtils";
import {
  PAPER_VOUCHER_MAX_IMAGES,
  PAPER_VOUCHER_TOO_MANY_IMAGES_MESSAGE
} from "./paperVoucher.utils";

const createRepository = () =>
  createPaperVoucherMockRepository(PAPER_VOUCHER_SEED, () => "2026-10-30T03:00:00.000Z");

const validDto = {
  name: "Voucher giấy 200.000đ",
  faceValue: 200000,
  totalQuantity: 50,
  expiresAt: "2027-06-30"
};

describe("paper voucher mock repository", () => {
  it("seeds batches without mutating the shared seed", async () => {
    const repository = createRepository();
    const batches = await repository.list();

    expect(batches.map((item) => item.batchCode)).toEqual(["LÔ-001", "LÔ-002", "LÔ-003", "LÔ-004"]);
    expect(batches.every((item) => item.usedCount <= item.totalQuantity)).toBe(true);

    await repository.setLocked({ id: 1, isLocked: true });
    expect(PAPER_VOUCHER_SEED[0].isLocked).toBe(false);
  });

  it("creates batches with unique codes that are never reused after delete", async () => {
    const repository = createRepository();

    const first = await repository.create(validDto);
    expect(first).toMatchObject({ batchCode: "LÔ-005", usedCount: 0, isLocked: false });

    await repository.remove(first.id);
    const second = await repository.create(validDto);

    expect(second.batchCode).toBe("LÔ-006");
    expect(second.id).not.toBe(first.id);
  });

  it("rejects invalid batches", async () => {
    const repository = createRepository();

    await expect(repository.create({ ...validDto, faceValue: 0 })).rejects.toThrow(/Mệnh giá/);
    await expect(repository.create({ ...validDto, totalQuantity: 1.5 })).rejects.toThrow(
      /Số lượng/
    );
    expect(await repository.list()).toHaveLength(4);
  });

  it("updates editable fields but protects history of used batches", async () => {
    const repository = createRepository();

    await expect(
      repository.update({
        id: 3,
        dto: {
          name: "Đổi tên",
          faceValue: 100000,
          totalQuantity: 80,
          validFrom: "2026-01-01",
          expiresAt: "2026-12-31"
        }
      })
    ).rejects.toThrow(/không được nhỏ hơn số đã sử dụng/);

    await expect(
      repository.update({
        id: 3,
        dto: {
          name: "Đổi tên",
          faceValue: 50000,
          totalQuantity: 300,
          validFrom: "2026-01-01",
          expiresAt: "2026-12-31"
        }
      })
    ).rejects.toThrow(/mệnh giá/);

    const updated = await repository.update({
      id: 3,
      dto: {
        name: "  Đổi tên  ",
        faceValue: 100000,
        totalQuantity: 300,
        validFrom: "2026-01-01",
        expiresAt: "2026-12-31"
      }
    });

    expect(updated).toMatchObject({ name: "Đổi tên", totalQuantity: 300, usedCount: 86 });
  });

  it("locks and unlocks without losing usage history", async () => {
    const repository = createRepository();

    expect(await repository.setLocked({ id: 3, isLocked: true })).toMatchObject({
      isLocked: true,
      usedCount: 86
    });
    expect(await repository.setLocked({ id: 3, isLocked: false })).toMatchObject({
      isLocked: false,
      usedCount: 86
    });
  });

  it("refuses to delete batches that have been used", async () => {
    const repository = createRepository();

    await expect(repository.remove(3)).rejects.toThrow(/không thể xóa/);
    await repository.remove(4);

    expect((await repository.list()).map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it("stores images in order and keeps them when the update leaves images untouched", async () => {
    stubObjectUrls();
    const repository = createRepository();

    const created = await repository.create({
      ...validDto,
      images: [{ file: createImageFile("truoc.png") }, { file: createImageFile("sau.png") }]
    });
    expect(created.images).toEqual([
      { url: "blob:paper-voucher/1", fileName: "truoc.png" },
      { url: "blob:paper-voucher/2", fileName: "sau.png" }
    ]);

    const updated = await repository.update({
      id: created.id,
      dto: { ...validDto, name: "Đổi tên" }
    });
    expect(updated.images).toEqual(created.images);
  });

  it("revokes removed image URLs only on the next list refresh and keeps reordered ones", async () => {
    const urls = stubObjectUrls();
    const repository = createRepository();
    const created = await repository.create({
      ...validDto,
      images: [{ file: createImageFile("cu.png") }, { file: createImageFile("sau.png") }]
    });
    const [oldImage, keptImage] = created.images ?? [];

    const replaced = await repository.update({
      id: created.id,
      dto: { ...validDto, images: [keptImage, { file: createImageFile("moi.png") }] }
    });
    expect(replaced.images?.map((image) => image.fileName)).toEqual(["sau.png", "moi.png"]);
    expect(urls.revokeObjectURL).not.toHaveBeenCalled();

    await repository.list();
    expect(urls.revokeObjectURL).toHaveBeenCalledWith(oldImage.url);
    expect(urls.revokeObjectURL).not.toHaveBeenCalledWith(keptImage.url);

    await repository.update({ id: created.id, dto: { ...validDto, images: [] } });
    await repository.list();
    expect(urls.revokeObjectURL).toHaveBeenCalledWith(keptImage.url);
  });

  it("rejects invalid image files and more images than allowed without creating object URLs", async () => {
    const urls = stubObjectUrls();
    const repository = createRepository();

    await expect(
      repository.create({
        ...validDto,
        images: [{ file: createImageFile("a.gif", "image/gif") }]
      })
    ).rejects.toThrow(/JPG, PNG hoặc WebP/);
    await expect(
      repository.create({
        ...validDto,
        images: Array.from({ length: PAPER_VOUCHER_MAX_IMAGES + 1 }, (_, index) => ({
          file: createImageFile(`${index}.png`)
        }))
      })
    ).rejects.toThrow(PAPER_VOUCHER_TOO_MANY_IMAGES_MESSAGE);
    expect(urls.createObjectURL).not.toHaveBeenCalled();
  });

  it("records a simulated redemption once and increases usedCount atomically", async () => {
    const repository = createRepository();
    const dto = {
      transactionId: "MOCK-1",
      lines: [
        { batchId: 3, quantity: 1, faceValue: 100000 },
        { batchId: 4, quantity: 1, faceValue: 95000 }
      ],
      ticketCount: 2,
      eligibleAmount: 180000,
      staffName: "Thu ngân A"
    };

    const usages = await repository.simulateRedemption(dto);
    expect(usages.map((usage) => usage.appliedAmount)).toEqual([100000, 80000]);
    expect(usages[0]).toMatchObject({
      transactionId: "MOCK-1",
      batchCode: "LÔ-003",
      quantity: 1,
      faceValue: 100000,
      staffName: "Thu ngân A",
      status: "simulated"
    });

    await expect(repository.simulateRedemption(dto)).rejects.toThrow(/đã được ghi nhận/);

    const batches = await repository.list();
    expect(batches.find((item) => item.id === 3)?.usedCount).toBe(87);
    expect(batches.find((item) => item.id === 4)?.usedCount).toBe(1);
    expect(await repository.listUsages(3)).toHaveLength(1);
  });

  it("rejects the whole simulation when any line is invalid", async () => {
    const repository = createRepository();
    await repository.setLocked({ id: 4, isLocked: true });

    await expect(
      repository.simulateRedemption({
        transactionId: "MOCK-2",
        lines: [
          { batchId: 3, quantity: 1, faceValue: 100000 },
          { batchId: 4, quantity: 1, faceValue: 95000 }
        ],
        ticketCount: 2,
        eligibleAmount: 200000
      })
    ).rejects.toThrow("LÔ-004: đã khóa");

    expect((await repository.list()).find((item) => item.id === 3)?.usedCount).toBe(86);
    expect(await repository.listUsages(3)).toEqual([]);
  });

  it("does not allow simulating more vouchers than seats or remaining quantity", async () => {
    const repository = createRepository();

    await expect(
      repository.simulateRedemption({
        transactionId: "MOCK-3",
        lines: [{ batchId: 3, quantity: 2, faceValue: 100000 }],
        ticketCount: 1,
        eligibleAmount: 100000
      })
    ).rejects.toThrow(/vượt số vé/);
    await expect(
      repository.simulateRedemption({
        transactionId: "MOCK-4",
        lines: [{ batchId: 3, quantity: 115, faceValue: 100000 }],
        ticketCount: 200,
        eligibleAmount: 1000000
      })
    ).rejects.toThrow(/chỉ còn 114/);
  });

  it("pages, filters and sorts like GET /batches", async () => {
    const repository = createRepository();
    const codes = async (query: Parameters<typeof repository.listPage>[0]) =>
      (await repository.listPage(query)).data.map((item) => item.batchCode);

    expect(await repository.listPage({ current: 2, pageSize: 3 })).toMatchObject({
      total: 4,
      current: 2,
      pageCount: 2,
      pageSize: 3,
      data: [{ batchCode: "LÔ-001" }]
    });
    expect(await codes({ current: 1, pageSize: 0 })).toEqual([
      "LÔ-004",
      "LÔ-003",
      "LÔ-002",
      "LÔ-001"
    ]);
    expect(await codes({ current: 1, pageSize: 20, sort: "faceValue.asc,usedCount.desc" })).toEqual(
      ["LÔ-002", "LÔ-004", "LÔ-001", "LÔ-003"]
    );
    expect(await codes({ current: 1, pageSize: 20, sort: "remainingQuantity.desc" })).toEqual([
      "LÔ-004",
      "LÔ-003",
      "LÔ-001",
      "LÔ-002"
    ]);
    expect(
      await codes({ current: 1, pageSize: 20, status: "active", keyword: "GIAY", faceValue: 95000 })
    ).toEqual(["LÔ-004"]);
    expect(
      await codes({ current: 1, pageSize: 20, expiresFrom: "2025-12-31", expiresTo: "2025-12-31" })
    ).toEqual(["LÔ-002", "LÔ-001"]);
    await expect(
      repository.listPage({ current: 1, pageSize: 20, sort: "password.asc" })
    ).rejects.toThrow(/sort không hợp lệ/);
  });

  it("keeps batches without expiry last when sorting expiry ascending", async () => {
    const repository = createRepository();
    const { name, faceValue, totalQuantity, validFrom } = await repository.get(4);
    await repository.update({
      id: 4,
      dto: { name, faceValue, totalQuantity, validFrom, expiresAt: null }
    });

    const page = await repository.listPage({ current: 1, pageSize: 20, sort: "expiresAt.asc" });
    expect(page.data.map((item) => item.batchCode)).toEqual([
      "LÔ-002",
      "LÔ-001",
      "LÔ-003",
      "LÔ-004"
    ]);
    expect(
      (await repository.listPage({ current: 1, pageSize: 20, noExpiry: true })).data.map(
        (item) => item.batchCode
      )
    ).toEqual(["LÔ-004"]);
  });

  it("summarises batches with counts per computed status", async () => {
    const repository = createRepository();
    await repository.setLocked({ id: 4, isLocked: true });

    expect(await repository.summary()).toEqual({
      totalBatches: 4,
      totalQuantity: 1100,
      usedCount: 654,
      remainingQuantity: 446,
      totalFaceValue: 103500000,
      usedFaceValue: 60400000,
      remainingFaceValue: 43100000,
      countByStatus: { active: 1, upcoming: 0, expired: 2, locked: 1, depleted: 0 },
      businessDate: "2026-10-30"
    });
    expect((await repository.summary({ status: "expired" })).totalBatches).toBe(2);
  });

  it("reads one batch and rejects unknown ids", async () => {
    const repository = createRepository();

    expect(await repository.get(3)).toMatchObject({ batchCode: "LÔ-003", usedCount: 86 });
    await expect(repository.get(99)).rejects.toThrow("Không tìm thấy lô voucher");
  });
});
