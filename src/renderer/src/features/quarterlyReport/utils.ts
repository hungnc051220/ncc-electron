import dayjs from "dayjs";

export const formatQuarterLabel = (value: string) => {
  const date = dayjs(value);
  return `Quý ${date.quarter()}/${date.year()}`;
};

export const formatQuarterFileNameLabel = (value: string) => {
  const date = dayjs(value);
  return `Quý ${date.quarter()}-${date.year()}`;
};
