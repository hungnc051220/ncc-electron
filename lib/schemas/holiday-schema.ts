import { z } from "zod";

export const holidayFormSchema = z.object({
  daysInWeek: z.array(z.number().optional()),
  specialDates: z.array(z.string().optional()),
  specificDate: z.date().nullable(),
});

export type HolidayFormInput = z.infer<typeof holidayFormSchema>;
