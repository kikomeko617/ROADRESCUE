// Input validation for every form. Nothing reaches the database without passing these.
import { z } from "zod";
import { AREAS, MAKES, BODY_TYPES, CAR_COLOURS } from "./constants.js";

const text = (min, max, label) =>
  z
    .string({ required_error: `${label} is required.` })
    .trim()
    .min(min, `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be ${max} characters or less.`)
    .refine((v) => !/[<>]/.test(v), `${label} cannot contain < or >.`);

// Ugandan mobile number, e.g. 0772123456 (fictitious numbers only in this prototype)
export const ugPhone = z
  .string({ required_error: "Phone number is required." })
  .trim()
  .regex(/^07\d{8}$/, "Enter a phone number like 0772123456 (10 digits starting with 07).");

export const password = z
  .string({ required_error: "Password is required." })
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password is too long.")
  .regex(/[A-Za-z]/, "Password must include a letter.")
  .regex(/\d/, "Password must include a number.");

export const registerSchema = z
  .object({
    name: text(2, 80, "Name"),
    email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(120),
    phone: ugPhone,
    password,
    role: z.enum(["customer", "mechanic", "driver"], { errorMap: () => ({ message: "Choose customer, mechanic or driver." }) }),
    area: z.string().optional(),
    skills: z.string().trim().max(120).optional(),
  })
  .refine((d) => d.role === "customer" || AREAS.includes(d.area), {
    message: "Mechanics and drivers must choose the area they work in.",
    path: ["area"],
  });

// Step 2 of a request: the customer's car (remembered for next time).
export const vehicleSchema = z.object({
  make: z.enum(MAKES, { errorMap: () => ({ message: "Choose the make of your car." }) }),
  body: z.enum(BODY_TYPES, { errorMap: () => ({ message: "Choose the type of vehicle." }) }),
  model: z
    .string()
    .trim()
    .max(30, "Model must be 30 characters or less.")
    .refine((v) => !/[<>]/.test(v), "Model cannot contain < or >.")
    .optional()
    .default(""),
  colour: z.union([z.enum(CAR_COLOURS), z.literal("")]).optional().default(""),
});

// Step 3 of a request: the area the customer is in.
export const areaSchema = z.object({
  area: z.enum(AREAS, { errorMap: () => ({ message: "Choose your area from the list or the map." }) }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const cartAddSchema = z.object({
  kind: z.enum(["SERVICE", "PART"]),
  refId: z.coerce.number().int().positive(),
  qty: z.coerce.number().int().min(1, "Quantity must be at least 1.").max(10, "You can add at most 10."),
});

export const checkoutSchema = z.object({
  area: z.enum(AREAS, { errorMap: () => ({ message: "Choose your area from the list." }) }),
  landmark: text(5, 120, "Landmark"),
  vehicle: text(3, 80, "Vehicle"),
  problemNote: z.string().trim().max(300, "Problem description must be 300 characters or less.").optional().default(""),
  method: z.enum(["MOCK_MOMO", "MOCK_AIRTEL"], { errorMap: () => ({ message: "Choose a payment method." }) }),
  payerPhone: ugPhone,
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Choose a rating from 1 to 5.").max(5, "Choose a rating from 1 to 5."),
  comment: z.string().trim().max(500, "Comment must be 500 characters or less.").optional().default(""),
});

export const claimSchema = z.object({
  description: text(10, 500, "Description"),
});

export const cancelSchema = z.object({
  reason: z.string().trim().max(200).optional().default(""),
});

export const resolveClaimSchema = z.object({
  decision: z.enum(["REVISIT", "REFUNDED", "REJECTED"]),
  note: text(3, 300, "Resolution note"),
});

export const stockSchema = z.object({
  stock: z.coerce.number().int().min(0, "Stock cannot be negative.").max(10000, "Stock is too high."),
});

// Mask a phone number so only the last 3 digits are kept: 0772123456 -> 07X XXX X456
export function maskPhone(phone) {
  return `07X XXX X${String(phone).slice(-3)}`;
}
