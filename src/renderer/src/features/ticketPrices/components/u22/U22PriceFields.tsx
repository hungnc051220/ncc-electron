// Nhập giá U22: mặc định hai nhóm (T2–T5, T6–CN); "Chỉnh riêng từng thứ (nâng cao)" mở 7 ô.
// API luôn nhận đủ 7 giá. Sửa giá nhóm chỉ đồng bộ trực tiếp khi mọi thứ trong nhóm đang cùng giá;
// nhóm đã có giá riêng thì phải bấm "Áp dụng cho cả nhóm" và xác nhận danh sách thứ bị ghi đè.
import { Button, InputNumber, Popconfirm, Switch, Tag, Tooltip, Typography } from "antd";
import { useState } from "react";
import {
  formatU22Price,
  getGroupPrice,
  getOverwrites,
  hasCustomPrices,
  isGroupUniform,
  U22_DAY_BY_KEY,
  U22_GROUPS,
  U22_MAX_PRICE,
  U22_MIN_PRICE,
  U22_PRICE_STEP,
  type U22DayKey,
  type U22DraftPrices,
  type U22Group,
  type U22Overwrite
} from "./u22PriceGroups";

const { Text } = Typography;

type PriceInputProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  ariaLabel: string;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
};

const PriceInput = ({
  value,
  onChange,
  ariaLabel,
  placeholder,
  invalid,
  disabled
}: PriceInputProps) => (
  <InputNumber<number>
    className="w-40!"
    min={U22_MIN_PRICE}
    max={U22_MAX_PRICE}
    step={U22_PRICE_STEP}
    precision={0}
    value={value}
    placeholder={placeholder}
    status={invalid ? "error" : undefined}
    aria-label={ariaLabel}
    disabled={disabled}
    suffix="đ"
    formatter={(input) =>
      input === undefined || input === null || `${input}` === ""
        ? ""
        : Number(input).toLocaleString("vi-VN")
    }
    parser={(input) =>
      input ? Number(String(input).replace(/[^\d]/g, "")) : (null as unknown as number)
    }
    onChange={(next) => onChange(typeof next === "number" ? next : null)}
  />
);

const OverwriteList = ({ overwrites }: { overwrites: U22Overwrite[] }) => (
  <div className="mt-1 flex flex-col gap-0.5">
    {overwrites.map((item) => (
      <div key={item.day}>
        {U22_DAY_BY_KEY[item.day].label}: <s>{formatU22Price(item.from)}</s> →{" "}
        <strong>{formatU22Price(item.to)}</strong>
      </div>
    ))}
  </div>
);

type GroupRowProps = {
  group: U22Group;
  prices: U22DraftPrices;
  expanded: boolean;
  disabled?: boolean;
  showErrors: boolean;
  onApply: (group: U22Group, value: number | null) => void;
};

const GroupRow = ({ group, prices, expanded, disabled, showErrors, onApply }: GroupRowProps) => {
  const [draft, setDraft] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const uniform = isGroupUniform(prices, group);
  const label = (
    <div className="flex w-44 flex-col">
      <span className="font-medium">{group.label}</span>
      <Text type="secondary" className="text-xs">
        {group.days.map((day) => U22_DAY_BY_KEY[day].short).join(", ")}
      </Text>
    </div>
  );

  // Nhóm cùng giá: sửa là đồng bộ ngay cho mọi thứ trong nhóm (không có giá riêng nào bị mất).
  if (uniform) {
    const groupPrice = getGroupPrice(prices, group);
    return (
      <div className="flex items-center gap-3">
        {label}
        <PriceInput
          value={groupPrice}
          ariaLabel={`Giá ${group.label}`}
          invalid={showErrors && !groupPrice}
          disabled={disabled}
          onChange={(value) => onApply(group, value)}
        />
        {expanded && <Text type="secondary">Đồng bộ cho {group.days.length} thứ</Text>}
      </div>
    );
  }

  // Nhóm có giá riêng: không ghi đè ngầm. Nhập giá mới rồi xác nhận danh sách thứ bị đổi.
  const overwrites = draft ? getOverwrites(prices, group, draft) : [];
  return (
    <div className="flex items-center gap-3">
      <div className="flex w-44 flex-col">
        <span className="font-medium">{group.label}</span>
        <Tag color="gold" className="mr-0! w-fit">
          Có giá riêng
        </Tag>
      </div>
      <PriceInput
        value={draft}
        placeholder="Nhiều mức giá"
        ariaLabel={`Giá chung mới cho ${group.label}`}
        disabled={disabled}
        onChange={setDraft}
      />
      <Popconfirm
        open={confirmOpen}
        onOpenChange={(open) => setConfirmOpen(open && Boolean(draft))}
        title={`Áp dụng ${formatU22Price(draft)} cho cả nhóm ${group.short}?`}
        description={
          <div>
            <div>Các thứ sau sẽ đổi giá:</div>
            <OverwriteList overwrites={overwrites} />
          </div>
        }
        okText="Ghi đè và áp dụng"
        cancelText="Giữ giá riêng"
        placement="rightTop"
        onConfirm={() => {
          if (draft) onApply(group, draft);
          setDraft(null);
          setConfirmOpen(false);
        }}
      >
        <Button disabled={!draft || disabled}>Áp dụng cho cả nhóm</Button>
      </Popconfirm>
    </div>
  );
};

type U22PriceFieldsProps = {
  prices: U22DraftPrices;
  onChange: (prices: U22DraftPrices) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  showErrors: boolean;
  invalidDays: U22DayKey[];
  disabled?: boolean;
};

const U22PriceFields = ({
  prices,
  onChange,
  expanded,
  onExpandedChange,
  showErrors,
  invalidDays,
  disabled
}: U22PriceFieldsProps) => {
  const custom = hasCustomPrices(prices);
  const invalid = new Set(invalidDays);

  const applyGroup = (group: U22Group, value: number | null) => {
    const next = { ...prices };
    group.days.forEach((day) => {
      next[day] = value;
    });
    onChange(next);
  };
  const setDay = (day: U22DayKey, value: number | null) => onChange({ ...prices, [day]: value });

  const collapseBlocked = expanded && custom;
  const toggle = (
    <Switch
      size="small"
      checked={expanded}
      disabled={collapseBlocked || disabled}
      onChange={onExpandedChange}
      aria-label="Chỉnh riêng từng thứ"
    />
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Giá vé U22</span>
        <label className="flex items-center gap-2">
          {collapseBlocked ? (
            <Tooltip title="Đang có thứ khác giá trong nhóm. Dùng “Áp dụng cho cả nhóm” để đưa nhóm về một giá trước khi thu gọn.">
              <span>{toggle}</span>
            </Tooltip>
          ) : (
            toggle
          )}
          <span>Chỉnh riêng từng thứ (nâng cao)</span>
        </label>
      </div>

      {U22_GROUPS.map((group) => (
        <GroupRow
          // Đổi key khi nhóm chuyển giữa "cùng giá" và "có giá riêng" để xóa giá nháp cũ.
          key={`${group.key}-${isGroupUniform(prices, group) ? "uniform" : "custom"}`}
          group={group}
          prices={prices}
          expanded={expanded}
          disabled={disabled}
          showErrors={showErrors}
          onApply={applyGroup}
        />
      ))}

      {expanded && (
        <div className="grid grid-cols-2 gap-3 rounded-md border border-gray-200 p-3">
          {U22_GROUPS.map((group) => (
            <div key={group.key} className="flex flex-col gap-2">
              <div className="font-medium">{group.label}</div>
              {group.days.map((day) => (
                <div key={day} className="flex items-center justify-between gap-2">
                  <span>{U22_DAY_BY_KEY[day].label}</span>
                  <PriceInput
                    value={prices[day]}
                    ariaLabel={`Giá ${U22_DAY_BY_KEY[day].label}`}
                    invalid={showErrors && invalid.has(day)}
                    disabled={disabled}
                    onChange={(value) => setDay(day, value)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <Text type="secondary">
        Giá áp theo <strong>thứ của ngày suất chiếu</strong>. Ngày lễ trong Danh sách ngày không áp
        dụng U22.
      </Text>
    </div>
  );
};

export default U22PriceFields;
