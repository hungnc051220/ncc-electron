import { OrderStatus, PaymentStatus, RefundStatus } from "@shared/types";
import type {
  AuditAction,
  AuditActionDefinition,
  AuditDetailContext,
  AuditFieldDefinition,
  AuditModelDefinition,
  AuditValueKind,
  KnownAuditAction
} from "./accessHistory.types";

const ALL_CONTEXTS: AuditDetailContext[] = ["summary", "create", "update", "delete"];
const DETAIL_CONTEXTS: AuditDetailContext[] = ["create", "update", "delete"];

const ORDER_STATUS_LABELS: Record<string, string> = {
  [OrderStatus.PENDING]: "Đang chờ",
  [OrderStatus.PROCESSING]: "Đang xử lý",
  [OrderStatus.COMPLETED]: "Hoàn thành",
  [OrderStatus.CANCELLED]: "Hủy bỏ",
  [OrderStatus.FAIL]: "Thất bại"
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  [PaymentStatus.PENDING]: "Đang chờ",
  [PaymentStatus.AUTHORIZED]: "Được ủy quyền",
  [PaymentStatus.PAID]: "Đã thanh toán",
  [PaymentStatus.PARTIALLY_REFUNDED]: "Hoàn tiền một phần",
  [PaymentStatus.REFUNDED]: "Đã hoàn tiền",
  [PaymentStatus.VOIDED]: "Đã hủy",
  [PaymentStatus.FAIL]: "Thất bại"
};

const REFUND_STATUS_LABELS: Record<string, string> = {
  [RefundStatus.PENDING]: "Chờ xử lý",
  [RefundStatus.ONLINE]: "Hoàn online",
  [RefundStatus.CASH]: "Hoàn tiền mặt"
};

const PLAN_CINEMA_STATUS_LABELS: Record<string, string> = {
  0: "Đang cập nhật",
  1: "Chờ duyệt",
  2: "Cần cập nhật",
  3: "Đã duyệt",
  4: "Đã lưu trữ"
};

const field = (
  label: string,
  kind: AuditValueKind = "text",
  summaryPriority = 50,
  options: Partial<AuditFieldDefinition> = {}
): AuditFieldDefinition => ({
  label,
  kind,
  summaryPriority,
  visibleIn: ALL_CONTEXTS,
  ...options
});

const COMMON_FIELDS: Record<string, AuditFieldDefinition> = {
  code: field("Mã", "text", 10),
  name: field("Tên", "text", 10),
  title: field("Tiêu đề", "text", 10),
  description: field("Mô tả", "text", 60, { aliases: ["desciption"] }),
  note: field("Ghi chú", "text", 60),
  comment: field("Ghi chú", "text", 60),
  adminComment: field("Ghi chú quản trị", "text", 65),
  status: field("Trạng thái", "status", 20),
  published: field("Trạng thái hiển thị", "boolean", 30, {
    booleanLabels: { true: "Đang hiển thị", false: "Đang ẩn" }
  }),
  deleted: field("Trạng thái xóa", "boolean", 80, {
    aliases: ["isDeleted"],
    booleanLabels: { true: "Đã xóa", false: "Đang hoạt động" }
  }),
  active: field("Trạng thái tài khoản", "boolean", 25, {
    aliases: ["isActive"],
    booleanLabels: { true: "Đang hoạt động", false: "Đang khóa" }
  }),
  hidden: field("Trạng thái hiển thị", "boolean", 35, {
    aliases: ["isHidden"],
    booleanLabels: { true: "Đang ẩn", false: "Đang hiển thị" }
  }),
  username: field("Tên đăng nhập", "text", 10),
  fullName: field("Họ và tên", "text", 10, { aliases: ["fullname"] }),
  firstName: field("Tên", "text", 15),
  lastName: field("Họ", "text", 15),
  customerFirstName: field("Họ", "text", 15),
  customerLastName: field("Tên", "text", 15),
  email: field("Email", "text", 30),
  phone: field("Số điện thoại", "text", 30),
  mobile: field("Số điện thoại", "text", 30),
  phoneNumber: field("Số điện thoại", "text", 30),
  address: field("Địa chỉ", "text", 40),
  startDate: field("Ngày bắt đầu", "date", 20),
  endDate: field("Ngày kết thúc", "date", 21),
  fromDate: field("Từ ngày", "date", 20),
  toDate: field("Đến ngày", "date", 21),
  dateOfIssue: field("Ngày ban hành", "date", 25),
  price: field("Giá", "money", 30),
  amount: field("Số tiền", "money", 30),
  total: field("Tổng tiền", "money", 30),
  quantity: field("Số lượng", "number", 30),
  percent: field("Tỷ lệ", "number", 40),
  orderNo: field("Thứ tự hiển thị", "number", 70)
};

const relationField = (
  label: string,
  relation: AuditFieldDefinition["relation"],
  summaryPriority: number
) => field(label, "relation", summaryPriority, { relation });

const USER_ACCOUNT_MODEL_DEFINITION: AuditModelDefinition = {
  label: "Tài khoản người dùng",
  sentenceLabel: "tài khoản người dùng",
  entityNamePaths: ["fullName", "fullname", "username"],
  allowCommonFields: false,
  fields: {
    username: field("Tên đăng nhập", "text", 1),
    fullName: field("Họ và tên", "text", 2, { aliases: ["fullname"] }),
    customerFirstName: field("Họ", "text", 10),
    customerLastName: field("Tên", "text", 10),
    email: field("Email", "text", 20),
    mobile: field("Số điện thoại", "text", 21),
    phone: field("Số điện thoại", "text", 21),
    roleIds: field("Vai trò", "text", 25),
    isStaff: field("Loại tài khoản", "boolean", 15, {
      booleanLabels: { true: "Nhân viên", false: "Khách hàng" }
    }),
    active: COMMON_FIELDS.active,
    hidden: COMMON_FIELDS.hidden,
    deleted: COMMON_FIELDS.deleted
  }
};

const PLAN_CINEMA_MODEL_DEFINITION: AuditModelDefinition = {
  label: "Kế hoạch chiếu phim",
  sentenceLabel: "kế hoạch chiếu phim",
  entityNamePaths: ["name", "title"],
  fields: {
    name: field("Tên kế hoạch", "text", 1),
    description: field("Mô tả", "text", 25, { aliases: ["desciption"] }),
    customerId: relationField("Khách hàng", "customer", 20),
    dateOfIssue: field("Ngày ban hành", "date", 15),
    startDate: field("Ngày bắt đầu", "date", 2),
    endDate: field("Ngày kết thúc", "date", 3),
    status: field("Trạng thái kế hoạch", "status", 4, {
      valueLabels: PLAN_CINEMA_STATUS_LABELS
    }),
    deleted: COMMON_FIELDS.deleted
  }
};

const MODEL_REGISTRY_VALUE: Record<string, AuditModelDefinition> = {
  Order: {
    label: "Đơn hàng",
    sentenceLabel: "đơn hàng",
    entityNamePaths: ["barCode", "orderGuid", "code"],
    fields: {
      barCode: field("Mã vé", "text", 1),
      orderGuid: field("Mã đơn hàng", "text", 2),
      customerId: relationField("Khách hàng", "customer", 10),
      customerFirstName: field("Họ khách hàng", "text", 11),
      customerLastName: field("Tên khách hàng", "text", 12),
      customerEmail: field("Email khách hàng", "text", 30),
      customerPhone: field("Số điện thoại khách hàng", "text", 20),
      planScreeningId: relationField("Lịch chiếu", "planScreening", 15),
      orderStatusId: field("Trạng thái đơn hàng", "status", 3, {
        valueLabels: ORDER_STATUS_LABELS
      }),
      paymentStatusId: field("Trạng thái thanh toán", "status", 4, {
        valueLabels: PAYMENT_STATUS_LABELS
      }),
      refundStatusId: field("Trạng thái hoàn tiền", "status", 5, {
        valueLabels: REFUND_STATUS_LABELS
      }),
      orderTotal: field("Tổng tiền", "money", 6),
      refundedAmount: field("Số tiền đã hoàn", "money", 7),
      paymentMethodSystemName: field("Phương thức thanh toán", "text", 8),
      paidDateUtc: field("Thời gian thanh toán", "datetime", 20),
      printedOnUtc: field("Thời gian in vé", "datetime", 25),
      isOnline: field("Kênh bán vé", "boolean", 12, {
        booleanLabels: { true: "Bán online", false: "Bán tại quầy" }
      }),
      isInvitation: field("Loại vé mời", "boolean", 45, {
        booleanLabels: { true: "Là vé mời", false: "Không phải vé mời" }
      }),
      isContract: field("Loại vé hợp đồng", "boolean", 46, {
        booleanLabels: { true: "Là vé hợp đồng", false: "Không phải vé hợp đồng" }
      }),
      isTicketUsed: field("Trạng thái sử dụng vé", "boolean", 15, {
        booleanLabels: { true: "Đã sử dụng", false: "Chưa sử dụng" }
      }),
      voucherCode: field("Mã ưu đãi", "text", 35),
      deleted: COMMON_FIELDS.deleted
    }
  },
  Film: {
    label: "Phim",
    sentenceLabel: "phim",
    entityNamePaths: ["filmName", "filmNameEn", "name"],
    fields: {
      filmName: field("Tên phim", "text", 1),
      filmNameEn: field("Tên phim tiếng Anh", "text", 10),
      versionCode: field("Phiên bản", "text", 12),
      premieredDay: field("Ngày khởi chiếu", "date", 3),
      duration: field("Thời lượng phim (phút)", "number", 15),
      director: field("Đạo diễn", "text", 16),
      actors: field("Diễn viên", "text", 30),
      introduction: field("Giới thiệu", "text", 50),
      manufacturerId: relationField("Hãng phim", "manufacturer", 5),
      countryId: field("Quốc gia", "relation", 25),
      statusCode: field("Trạng thái phim", "status", 4, {
        valueLabels: { SHOWING: "Đang chiếu" }
      }),
      languageCode: field("Ngôn ngữ", "text", 20),
      ageAbove: field("Độ tuổi tối thiểu", "number", 18),
      proposedPrice: field("Giá vé đề xuất", "money", 19),
      sellOnline: field("Bán vé online", "boolean", 6, {
        booleanLabels: { true: "Đang bật", false: "Đang tắt" }
      }),
      published: COMMON_FIELDS.published,
      deleted: COMMON_FIELDS.deleted,
      isHot: field("Phim nổi bật", "boolean", 35, {
        booleanLabels: { true: "Đang nổi bật", false: "Không nổi bật" }
      })
    }
  },
  Category: {
    label: "Phân loại phim",
    sentenceLabel: "phân loại phim",
    entityNamePaths: ["name", "title"],
    fields: {
      name: field("Tên phân loại", "text", 1),
      description: field("Mô tả", "text", 10),
      published: COMMON_FIELDS.published,
      deleted: COMMON_FIELDS.deleted
    }
  },
  Manufacturer: {
    label: "Hãng phim",
    sentenceLabel: "hãng phim",
    entityNamePaths: ["name", "fullName"],
    fields: {
      name: field("Tên hãng phim", "text", 1),
      fullName: field("Tên đầy đủ", "text", 2, { aliases: ["fullname"] }),
      description: field("Mô tả", "text", 30),
      address: field("Địa chỉ", "text", 20),
      accountBank: field("Số tài khoản", "text", 35, { aliases: ["acountBank"] }),
      bankName: field("Ngân hàng", "text", 36),
      addressBank: field("Chi nhánh ngân hàng", "text", 37),
      phoneNumber: field("Số điện thoại", "text", 10),
      fax: field("Fax", "text", 40),
      url: field("Website", "text", 45),
      published: COMMON_FIELDS.published,
      hidden: COMMON_FIELDS.hidden,
      deleted: COMMON_FIELDS.deleted
    }
  },
  PlanCinema: PLAN_CINEMA_MODEL_DEFINITION,
  PlanCinemaFlying: PLAN_CINEMA_MODEL_DEFINITION,
  PlanScreenings: {
    label: "Lịch chiếu phim",
    sentenceLabel: "lịch chiếu phim",
    entityNamePaths: ["filmName", "filmInfo.filmName", "name"],
    fields: {
      filmId: relationField("Phim", "film", 1),
      projectDate: field("Ngày chiếu", "date", 2),
      projectTime: field("Giờ chiếu", "time", 3),
      roomId: relationField("Phòng chiếu", "room", 4),
      daypartId: relationField("Khung giờ", "dayPart", 5),
      planCinemaId: relationField("Kế hoạch chiếu", "planCinema", 20),
      priceOfPosition1: field("Giá vé vị trí 1", "ticketPrice", 10, {
        omitWhenEmpty: true
      }),
      priceOfPosition2: field("Giá vé vị trí 2", "ticketPrice", 11, {
        omitWhenEmpty: true
      }),
      priceOfPosition3: field("Giá vé vị trí 3", "ticketPrice", 12, {
        omitWhenEmpty: true
      }),
      priceOfPosition4: field("Giá vé vị trí 4", "ticketPrice", 13, {
        omitWhenEmpty: true
      }),
      isOnlineSelling: field("Bán vé online", "boolean", 6, {
        booleanLabels: { true: "Đang bật", false: "Đang tắt" }
      }),
      isSelling: field("Trạng thái bán vé", "boolean", 7, {
        booleanLabels: { true: "Đang bán", false: "Chưa bán" }
      }),
      noOnlineChairF1: field("Ghế không bán online tầng 1", "text", 40, {
        visibleIn: DETAIL_CONTEXTS,
        omitWhenEmpty: true
      }),
      noOnlineChairF2: field("Ghế không bán online tầng 2", "text", 41, {
        visibleIn: DETAIL_CONTEXTS,
        omitWhenEmpty: true
      }),
      noOnlineChairF3: field("Ghế không bán online tầng 3", "text", 42, {
        visibleIn: DETAIL_CONTEXTS,
        omitWhenEmpty: true
      }),
      deleted: field("Trạng thái xóa", "boolean", 80, {
        visibleIn: ["update", "delete"],
        booleanLabels: { true: "Đã xóa", false: "Đang hoạt động" }
      })
    }
  },
  DayPart: {
    label: "Khung giờ chiếu",
    sentenceLabel: "khung giờ chiếu",
    entityNamePaths: ["name", "title"],
    fields: {
      name: field("Tên khung giờ", "text", 1),
      fromTime: field("Giờ bắt đầu", "time", 2),
      toTime: field("Giờ kết thúc", "time", 3),
      dateTypeId: field("Loại ngày", "status", 10, {
        valueLabels: { 1: "Ngày thường", 2: "Ngày lễ" }
      }),
      deleted: COMMON_FIELDS.deleted
    }
  },
  Room: {
    label: "Phòng chiếu",
    sentenceLabel: "phòng chiếu",
    entityNamePaths: ["name", "roomName"],
    fields: {
      name: field("Tên phòng", "text", 1),
      roomName: field("Tên phòng", "text", 1),
      numberOfFloor: field("Số tầng", "number", 5),
      floor: field("Tầng", "text", 6),
      wideSizeF1: field("Chiều rộng tầng 1", "number", 30),
      deepSizeF1: field("Chiều sâu tầng 1", "number", 31),
      wideSizeF2: field("Chiều rộng tầng 2", "number", 32),
      deepSizeF2: field("Chiều sâu tầng 2", "number", 33),
      wideSizeF3: field("Chiều rộng tầng 3", "number", 34),
      deepSizeF3: field("Chiều sâu tầng 3", "number", 35),
      noBreak: field("Cho phép ghế gián đoạn", "boolean", 20, {
        booleanLabels: { true: "Không cho phép", false: "Cho phép" }
      }),
      hidden: COMMON_FIELDS.hidden,
      deleted: COMMON_FIELDS.deleted
    }
  },
  Position: {
    label: "Hạng ghế",
    sentenceLabel: "hạng ghế",
    entityNamePaths: ["name", "positionCode", "code"],
    fields: {
      positionCode: field("Mã hạng ghế", "text", 1),
      name: field("Tên hạng ghế", "text", 2),
      isDefault: field("Hạng ghế mặc định", "boolean", 5, {
        booleanLabels: { true: "Là hạng mặc định", false: "Không phải hạng mặc định" }
      }),
      isSeat: field("Loại vị trí", "boolean", 6, {
        booleanLabels: { true: "Là ghế", false: "Không phải ghế" }
      }),
      color: field("Màu hiển thị", "text", 10),
      deleted: COMMON_FIELDS.deleted
    }
  },
  CancelReason: {
    label: "Lý do hủy vé",
    sentenceLabel: "lý do hủy vé",
    entityNamePaths: ["name", "reason", "title", "description"],
    fields: {
      name: field("Lý do hủy", "text", 1),
      reason: field("Lý do hủy", "text", 1),
      title: field("Lý do hủy", "text", 1),
      description: field("Nội dung lý do", "text", 2),
      deleted: COMMON_FIELDS.deleted
    }
  },
  Customer: USER_ACCOUNT_MODEL_DEFINITION,
  User: USER_ACCOUNT_MODEL_DEFINITION
};

export const MODEL_REGISTRY = MODEL_REGISTRY_VALUE;

export const MODEL_OPTIONS = Object.entries(MODEL_REGISTRY_VALUE).map(([value, definition]) => ({
  value,
  label: definition.label
}));

export const ACTION_DEFINITIONS: Record<AuditAction, AuditActionDefinition> = {
  CREATE: { label: "Tạo mới", compactVerb: "Tạo", verb: "đã tạo mới" },
  UPDATE: { label: "Cập nhật", compactVerb: "Cập nhật", verb: "đã cập nhật" },
  DELETE: { label: "Xóa", compactVerb: "Xóa", verb: "đã xóa" },
  OTHER: {
    label: "Hoạt động khác",
    compactVerb: "Ghi nhận hoạt động trên",
    verb: "đã thực hiện thao tác trên"
  }
};

const FIELD_ALIASES: Record<string, string> = {
  desciption: "description",
  acountbank: "accountBank",
  createdonutc: "createdOnUtc",
  updatedonutc: "updatedOnUtc",
  fullname: "fullName",
  planscreenid: "planScreeningId",
  planscreeningid: "planScreeningId",
  isdeleted: "deleted",
  daypartid: "daypartId"
};

const SENSITIVE_FIELD_PATTERNS = [
  /^password/,
  /passwordsalt/,
  /^otp$/,
  /^dateotp$/,
  /(?:access|refresh|identity)?token$/,
  /secret/,
  /cardnumber/,
  /creditcard/,
  /cardcvv/,
  /^cvv/,
  /cardexpiration/,
  /^idcard$/,
  /^lastipaddress$/,
  /authorizationtransaction/,
  /capturetransaction/,
  /subscriptiontransaction/,
  /^transactionid$/
];

const TECHNICAL_FIELDS = new Set([
  "id",
  "storeid",
  "createdat",
  "updatedat",
  "deletedat",
  "createdonutc",
  "updatedonutc",
  "createduser",
  "updateduser",
  "subjecttoacl",
  "limitedtostores",
  "pictureid",
  "pictureurl",
  "imageurl",
  "posterurl",
  "trailerurl",
  "videourl",
  "metadescription",
  "metakeyword",
  "metakeywords",
  "metatitle",
  "pagesize",
  "pagesizeoptions",
  "allowcustomerstoselectpagesize"
]);

const getLeafKey = (path: string) => path.split(".").pop() || path;
const normalizePolicyKey = (path: string) =>
  getLeafKey(path)
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

export const getCanonicalFieldPath = (path: string, model?: string | null) => {
  const parts = path.split(".");
  const leaf = parts.pop() || path;
  const globallyCanonicalLeaf = FIELD_ALIASES[leaf.toLowerCase()] || leaf;
  const modelDefinition = model ? MODEL_REGISTRY_VALUE[model] : undefined;
  const aliasedModelField = modelDefinition
    ? Object.entries(modelDefinition.fields).find(([, definition]) =>
        definition.aliases?.some(
          (alias) => alias.toLowerCase() === globallyCanonicalLeaf.toLowerCase()
        )
      )?.[0]
    : undefined;
  const canonicalLeaf = aliasedModelField || globallyCanonicalLeaf;
  return [...parts, canonicalLeaf].filter(Boolean).join(".");
};

export const isSensitiveAuditField = (path: string) => {
  const normalized = normalizePolicyKey(path);
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(normalized));
};

export const isTechnicalAuditField = (path: string) =>
  TECHNICAL_FIELDS.has(normalizePolicyKey(path));

export const getModelDefinition = (model: string | null | undefined) =>
  model ? MODEL_REGISTRY_VALUE[model] : undefined;

export const getFieldDefinition = (
  model: string | null | undefined,
  path: string
): AuditFieldDefinition | undefined => {
  if (isSensitiveAuditField(path) || isTechnicalAuditField(path)) return undefined;

  const canonicalPath = getCanonicalFieldPath(path, model);
  const definition = getModelDefinition(model);
  const modelField = definition?.fields[canonicalPath];
  if (modelField) return modelField;

  if (definition?.allowCommonFields === false || canonicalPath.includes(".")) return undefined;
  return COMMON_FIELDS[canonicalPath];
};

export const normalizeAuditAction = (action: string | null | undefined): AuditAction => {
  const normalized = action?.trim().toUpperCase();
  return normalized === "CREATE" || normalized === "UPDATE" || normalized === "DELETE"
    ? (normalized as KnownAuditAction)
    : "OTHER";
};

export const getActionDefinition = (action: string | null | undefined) =>
  ACTION_DEFINITIONS[normalizeAuditAction(action)];
