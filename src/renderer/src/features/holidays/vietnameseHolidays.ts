/**
 * Ngày lễ gợi ý khi "Khởi tạo năm" / "Thiết lập ngày" (chỉ là đề xuất cấu hình, Admin chọn/bỏ từng ngày và đổi
 * "Giá vé áp dụng" của từng ngày; không dùng để tính giá). Mọi ngày lễ đều không áp dụng ưu đãi U22 (V3.2):
 * - 11 ngày nghỉ lễ theo luật định Việt Nam (Bộ luật Lao động 2019, Điều 112): Tết Dương lịch 01/01;
 *   Tết Nguyên đán 5 ngày (ngày cuối năm âm lịch → mùng 4); Giỗ Tổ Hùng Vương 10/3 âm lịch; 30/4; 1/5;
 *   Quốc khánh 02/09 và ngày liền kề mặc định 01/09 (năm nào khác thì Admin sửa tay). Gợi ý "Giá ngày lễ".
 * - 6 ngày lễ của NCC (kế hoạch D18): 14/02, 08/03, 24/12 gợi ý "Giá ngày lễ" (chính sách giá vé công bố);
 *   20/10, 31/10, 20/11 gợi ý "Theo ngày trong tuần" — vẫn nằm ở tab Ngày lễ, không áp U22, nhưng không bị ép
 *   giá ngày lễ.
 * Trùng ngày (vd. 14/02/2029 là Tết Mùng 2) thì chỉ giữ một dòng, ưu tiên ngày nghỉ lễ luật định.
 * Âm lịch quy đổi theo thuật toán của Hồ Ngọc Đức (múi giờ +7, lịch Việt Nam).
 */
import dayjs from "dayjs";

/** `applyHolidayPrice`: gợi ý "Giá vé áp dụng" (`true` = Giá ngày lễ, `false` = Theo ngày trong tuần). */
export type DefaultHoliday = { dateValue: string; holidayName: string; applyHolidayPrice: boolean };

const TIME_ZONE = 7;
const INT = Math.floor;

const jdFromDate = (dd: number, mm: number, yy: number) => {
  const a = INT((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  return dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
};

const jdToDate = (jd: number) => {
  const a = jd + 32044;
  const b = INT((4 * a + 3) / 146097);
  const c = a - INT((b * 146097) / 4);
  const d = INT((4 * c + 3) / 1461);
  const e = c - INT((1461 * d) / 4);
  const m = INT((5 * e + 2) / 153);
  const day = e - INT((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * INT(m / 10);
  const year = b * 100 + d - 4800 + INT(m / 10);
  return { day, month, year };
};

const newMoon = (k: number) => {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let c1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  c1 = c1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  c1 -= 0.0004 * Math.sin(dr * 3 * Mpr);
  c1 = c1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  c1 = c1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  c1 = c1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  c1 = c1 + 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  const deltaT =
    T < -11
      ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return jd1 + c1 - deltaT;
};

const sunLongitude = (jdn: number) => {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL = DL + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
  let L = (L0 + DL) * dr;
  L -= Math.PI * 2 * INT(L / (Math.PI * 2));
  return L;
};

const getSunLongitude = (dayNumber: number) =>
  INT((sunLongitude(dayNumber - 0.5 - TIME_ZONE / 24) / Math.PI) * 6);

const getNewMoonDay = (k: number) => INT(newMoon(k) + 0.5 + TIME_ZONE / 24);

const getLunarMonth11 = (yy: number) => {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = INT(off / 29.530588853);
  const nm = getNewMoonDay(k);
  return getSunLongitude(nm) >= 9 ? getNewMoonDay(k - 1) : nm;
};

const getLeapMonthOffset = (a11: number) => {
  const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i));
  do {
    last = arc;
    i += 1;
    arc = getSunLongitude(getNewMoonDay(k + i));
  } while (arc !== last && i < 14);
  return i - 1;
};

/** Ngày Julius của ngày âm lịch (tháng không nhuận) trong năm âm lịch `lunarYear`. */
const lunarToJd = (lunarDay: number, lunarMonth: number, lunarYear: number) => {
  const a11 = getLunarMonth11(lunarMonth < 11 ? lunarYear - 1 : lunarYear);
  const b11 = getLunarMonth11(lunarMonth < 11 ? lunarYear : lunarYear + 1);
  const k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let off = lunarMonth - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365 && off >= getLeapMonthOffset(a11)) off += 1;
  return getNewMoonDay(k + off) + lunarDay - 1;
};

const fromJd = (jd: number) => {
  const { day, month, year } = jdToDate(jd);
  return dayjs(new Date(year, month - 1, day)).format("YYYY-MM-DD");
};

/** Dương lịch (YYYY-MM-DD) của một ngày âm lịch, tháng không nhuận. */
export const lunarToSolar = (lunarDay: number, lunarMonth: number, lunarYear: number) =>
  fromJd(lunarToJd(lunarDay, lunarMonth, lunarYear));

/** Ngày lễ riêng của NCC (`MM-DD`, tên chuẩn theo kế hoạch D18) và "Giá vé áp dụng" gợi ý. */
export const NCC_HOLIDAYS = [
  { monthDay: "02-14", holidayName: "Valentine", applyHolidayPrice: true },
  { monthDay: "03-08", holidayName: "Quốc tế Phụ nữ", applyHolidayPrice: true },
  { monthDay: "10-20", holidayName: "Phụ nữ Việt Nam", applyHolidayPrice: false },
  { monthDay: "10-31", holidayName: "Halloween", applyHolidayPrice: false },
  { monthDay: "11-20", holidayName: "Nhà giáo Việt Nam", applyHolidayPrice: false },
  { monthDay: "12-24", holidayName: "Giáng sinh", applyHolidayPrice: true }
] as const;

/** "Giá vé áp dụng" gợi ý cho một ngày lễ NCC (`MM-DD` khớp); `undefined` với các ngày khác. */
export const getSuggestedApplyHolidayPrice = (dateValue: string): boolean | undefined =>
  NCC_HOLIDAYS.find(({ monthDay }) => dateValue.slice(5, 10) === monthDay)?.applyHolidayPrice;

const getNccHolidays = (year: number): DefaultHoliday[] =>
  NCC_HOLIDAYS.map(({ monthDay, holidayName, applyHolidayPrice }) => ({
    dateValue: `${year}-${monthDay}`,
    holidayName,
    applyHolidayPrice
  }));

/** Mỗi ngày một dòng: dòng xuất hiện trước (ngày nghỉ lễ luật định) được giữ. */
const uniqueByDate = (holidays: DefaultHoliday[]) =>
  holidays.filter(
    (holiday, index) => holidays.findIndex((item) => item.dateValue === holiday.dateValue) === index
  );

/** 11 ngày nghỉ lễ theo luật định của năm (Tết, Giỗ Tổ quy đổi từ âm lịch). */
export const getStatutoryHolidays = (year: number): DefaultHoliday[] => {
  const tet = lunarToJd(1, 1, year);
  const lastDayOfYear = tet - 1 - lunarToJd(1, 12, year - 1) + 1; // 29 hoặc 30 Tết
  const tetDays = [
    { jd: tet - 1, label: `${lastDayOfYear} Tết` },
    { jd: tet, label: "Mùng 1" },
    { jd: tet + 1, label: "Mùng 2" },
    { jd: tet + 2, label: "Mùng 3" },
    { jd: tet + 3, label: "Mùng 4" }
  ].map(({ jd, label }) => ({
    dateValue: fromJd(jd),
    holidayName: `Tết Nguyên đán (${label})`,
    applyHolidayPrice: true
  }));
  const solar = (monthDay: string, holidayName: string): DefaultHoliday => ({
    dateValue: `${year}-${monthDay}`,
    holidayName,
    applyHolidayPrice: true
  });
  return [
    solar("01-01", "Tết Dương lịch"),
    ...tetDays,
    {
      dateValue: lunarToSolar(10, 3, year),
      holidayName: "Giỗ Tổ Hùng Vương",
      applyHolidayPrice: true
    },
    solar("04-30", "Ngày Giải phóng miền Nam"),
    solar("05-01", "Ngày Quốc tế Lao động"),
    solar("09-01", "Quốc khánh (nghỉ liền kề)"),
    solar("09-02", "Quốc khánh")
  ]
    .filter((holiday) => holiday.dateValue.startsWith(`${year}-`))
    .sort((left, right) => left.dateValue.localeCompare(right.dateValue));
};

/** Ngày lễ mặc định: 11 ngày luật định + 6 ngày NCC, sắp theo ngày, mỗi ngày một dòng. */
export const getDefaultHolidays = (year: number): DefaultHoliday[] =>
  uniqueByDate(
    // sort ổn định: cùng ngày thì ngày luật định (đứng trước trong mảng) được giữ.
    [...getStatutoryHolidays(year), ...getNccHolidays(year)].sort((left, right) =>
      left.dateValue.localeCompare(right.dateValue)
    )
  );
