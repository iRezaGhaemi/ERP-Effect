import { createPageSchema } from "@effect-erp/contracts";
import { z } from "zod";

const customerNameSchema = z.string().trim().min(1).max(160);
const nullableText = (max: number) =>
  z.string().trim().min(1).max(max).nullable().optional().default(null);
const nullableEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(254)
  .nullable()
  .optional()
  .default(null);

export const CustomerStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]);
export const CustomerPageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).default(""),
  status: CustomerStatusSchema.optional(),
  sort: z.enum(["name", "createdAt", "updatedAt"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});
export const VersionSchema = z.number().int().min(1);

export const CreateCustomerSchema = z.object({
  name: customerNameSchema,
  legalName: nullableText(200),
  ownerUserId: z.uuid(),
  phone: nullableText(40),
  email: nullableEmail,
  notes: nullableText(4000),
});

export const UpdateCustomerSchema = z
  .object({
    name: customerNameSchema.optional(),
    legalName: nullableText(200).optional(),
    ownerUserId: z.uuid().optional(),
    phone: nullableText(40).optional(),
    email: nullableEmail.optional(),
    notes: nullableText(4000).optional(),
    status: CustomerStatusSchema.optional(),
    version: VersionSchema,
  })
  .refine(
    ({ version: _version, ...values }) => Object.keys(values).length > 0,
    "حداقل یک فیلد باید ارسال شود.",
  );

export const ContactDtoSchema = z.object({
  id: z.uuid(),
  customerId: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  jobTitle: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  isPrimary: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: VersionSchema,
});

const contactFields = {
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  jobTitle: nullableText(160),
  phone: nullableText(40),
  email: nullableEmail,
  isPrimary: z.boolean().default(false),
};

export const CreateContactSchema = z.object(contactFields);
export const UpdateContactSchema = z
  .object({
    firstName: contactFields.firstName.optional(),
    lastName: contactFields.lastName.optional(),
    jobTitle: nullableText(160).optional(),
    phone: nullableText(40).optional(),
    email: nullableEmail.optional(),
    isPrimary: z.boolean().optional(),
    version: VersionSchema,
  })
  .refine(
    ({ version: _version, ...values }) => Object.keys(values).length > 0,
    "حداقل یک فیلد باید ارسال شود.",
  );

export const CustomerDtoSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  legalName: z.string().nullable(),
  status: CustomerStatusSchema,
  ownerUserId: z.uuid(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  notes: z.string().nullable(),
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: VersionSchema,
});
export const CustomerDetailDtoSchema = CustomerDtoSchema.extend({
  contacts: z.array(ContactDtoSchema),
});
export const CustomerPageSchema = createPageSchema(CustomerDtoSchema);

export type CustomerDto = z.infer<typeof CustomerDtoSchema>;
export type CustomerDetailDto = z.infer<typeof CustomerDetailDtoSchema>;
export type CustomerPageQuery = z.infer<typeof CustomerPageQuerySchema>;
export type CreateCustomerInput = z.input<typeof CreateCustomerSchema>;
export type UpdateCustomerInput = z.input<typeof UpdateCustomerSchema>;
export type ContactDto = z.infer<typeof ContactDtoSchema>;
export type CreateContactInput = z.input<typeof CreateContactSchema>;
export type UpdateContactInput = z.input<typeof UpdateContactSchema>;
