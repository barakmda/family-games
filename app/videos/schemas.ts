import { z } from "zod";
import { zColor } from "@remotion/zod-types";

export const greetingSchema = z.object({
  familyName: z.string().default("משפחת כהן"),
  greetingText: z.string().default('ברוכים הבאים לממ"ד'),
  personName: z.string().default(""),
  backgroundColor: zColor().default("#78350f"),
  textColor: zColor().default("#fffbeb"),
  fontSize: z.number().min(30).max(120).default(72),
  durationInSeconds: z.number().min(2).max(10).default(5),
});

export type GreetingProps = z.infer<typeof greetingSchema>;
