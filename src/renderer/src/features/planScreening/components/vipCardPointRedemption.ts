export const POINT_REDEMPTION_STEP = 1000;

export const roundPointRedemptionLimitDown = (points: number) =>
  Math.floor(Math.max(points, 0) / POINT_REDEMPTION_STEP) * POINT_REDEMPTION_STEP;

export const roundPointRedemptionLimitUp = (points: number) =>
  Math.ceil(Math.max(points, 0) / POINT_REDEMPTION_STEP) * POINT_REDEMPTION_STEP;

export const isValidPointRedemptionIncrement = (points: number) =>
  Number.isInteger(points) && points % POINT_REDEMPTION_STEP === 0;
