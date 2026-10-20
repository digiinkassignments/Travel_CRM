import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { requireEntitlement } from "../guards/entitlement.guard";
import { requirePermission } from "../guards/rbac.guard";
import { logTenantAction } from "../audit/audit.service";

export const customersRouter = Router();

// Customers are part of the base Enquiry & Customer CRM module — included
// from Starter upward (SRS section 6), so entitlement-gated on
// "enquiry_crm" rather than a dedicated "customers" flag.
customersRouter.use(authenticate, scopeTenant(), requireEntitlement("enquiry_crm"));

customersRouter.get("/", requirePermission("customers", "view"), async (req, res, next) => {
  try {
    const search = (req.query.search as string) ?? "";
    const customers = await prisma.customer.findMany({
      where: {
        clientId: req.clientId!,
        ...(search
          ? { OR: [{ name: { contains: search } }, { phone: { contains: search } }, { email: { contains: search } }] }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return ok(res, customers);
  } catch (err) {
    next(err);
  }
});

customersRouter.get("/:id", requirePermission("customers", "view"), async (req, res, next) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, clientId: req.clientId! },
      include: {
        enquiries: { orderBy: { createdAt: "desc" } },
        bookings: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!customer) return fail(res, 404, "Customer not found", "NOT_FOUND");
    return ok(res, customer);
  } catch (err) {
    next(err);
  }
});

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")).or(z.null()),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

customersRouter.post("/", requirePermission("customers", "add"), async (req, res, next) => {
  try {
    const input = customerSchema.parse(req.body);
    const customer = await prisma.customer.create({
      data: {
        clientId: req.clientId!,
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email ? input.email.trim() : null,
        address: input.address ? input.address.trim() : null,
        notes: input.notes ? input.notes.trim() : null,
      },
    });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "CREATE_CUSTOMER", target: customer.id });
    return ok(res, customer, "Customer created");
  } catch (err) {
    next(err);
  }
});

customersRouter.patch("/:id", requirePermission("customers", "edit"), async (req, res, next) => {
  try {
    const input = customerSchema.partial().parse(req.body);
    const existing = await prisma.customer.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!existing) return fail(res, 404, "Customer not found", "NOT_FOUND");

    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.phone !== undefined) updateData.phone = input.phone.trim();
    if (input.email !== undefined) updateData.email = input.email ? input.email.trim() : null;
    if (input.address !== undefined) updateData.address = input.address ? input.address.trim() : null;
    if (input.notes !== undefined) updateData.notes = input.notes ? input.notes.trim() : null;

    const customer = await prisma.customer.update({ where: { id: req.params.id }, data: updateData });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "UPDATE_CUSTOMER", target: customer.id });
    return ok(res, customer, "Customer updated");
  } catch (err) {
    next(err);
  }
});

customersRouter.delete("/:id", requirePermission("customers", "delete"), async (req, res, next) => {
  try {
    const existing = await prisma.customer.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!existing) return fail(res, 404, "Customer not found", "NOT_FOUND");

    await prisma.customer.delete({ where: { id: req.params.id } });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "DELETE_CUSTOMER", target: req.params.id });
    return ok(res, {}, "Customer deleted");
  } catch (err) {
    next(err);
  }
});

// Bulk CSV import (SRS FR-3.1). Expects an array already parsed
// client-side (frontend uses PapaParse) rather than a raw file upload —
// keeps this endpoint simple and avoids adding a multipart-upload
// dependency for Phase 4.
const csvImportSchema = z.object({
  rows: z.array(z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().optional(),
    address: z.string().optional(),
  })).max(1000),
});

customersRouter.post("/import", requirePermission("customers", "add"), async (req, res, next) => {
  try {
    const { rows } = csvImportSchema.parse(req.body);
    const created = await prisma.customer.createMany({
      data: rows.map((r) => ({ clientId: req.clientId!, ...r })),
    });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "IMPORT_CUSTOMERS", metadata: { count: created.count } });
    return ok(res, { imported: created.count }, `Imported ${created.count} customers`);
  } catch (err) {
    next(err);
  }
});
