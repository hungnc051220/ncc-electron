export interface RoomProps {
  id: number;
  name: string;
  wideSizeF1: number;
  deepSizeF1: number;
  wideSizeF2: number;
  deepSizeF2: number;
  wideSizeF3: number;
  deepSizeF3: number;
  ruleOrder: string;
  noBreak: boolean;
  numberOfFloor: number;
  pictureId: number;
  deleted: boolean;
  subjectToAcl: boolean;
  limitedToStores: boolean;
  orderNo: number;
  floor: string;
}
