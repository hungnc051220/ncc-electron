import { GeneralDataProps } from "@/types";
import { create } from "zustand";

interface GeneralDataState {
  data: GeneralDataProps | undefined;
  setData: (data: GeneralDataProps) => void;
}

const useGeneralData = create<GeneralDataState>((set) => ({
  data: undefined,
  setData: (data: GeneralDataProps) => set(() => ({ data })),
}));

export default useGeneralData;
