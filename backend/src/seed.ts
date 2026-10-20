import { prisma } from "./db/prisma";
import { hashPassword } from "./auth/password";
import { provisionNewClient } from "./provisioning/provisioning.service";

/**
 * Seeds: a Super Admin login, the four plans, and one demo tenant — all in
 * the single shared database. Run with: npm run seed
 */
async function main() {
  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@digiinksolutions.com";
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD;
  if (!superAdminPassword) {
    throw new Error("Set SEED_SUPER_ADMIN_PASSWORD before running the seed script.");
  }

  await prisma.superAdminUser.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: { email: superAdminEmail, name: "Digiink Super Admin", passwordHash: await hashPassword(superAdminPassword) },
  });

  const planDefs = [
    {
      name: "Starter", priceInPaise: 199900, maxUsers: 3, maxEnquiriesPerMonth: 100, maxBranches: 1,
      entitlements: {
        enquiry_crm: true, bookings: true, quotation: false, drivers: false, vehicles: false,
        payments: false, basic_reports: false, advanced_reports: false, workflow_automation: false,
        enhanced_controls: false, multi_branch: false, integrations: false, custom_modules: false,
      },
    },
    {
      name: "Professional", priceInPaise: 399900, maxUsers: 10, maxEnquiriesPerMonth: null, maxBranches: 1,
      entitlements: {
        enquiry_crm: true, bookings: true, quotation: true, drivers: true, vehicles: true,
        payments: true, basic_reports: true, advanced_reports: false, workflow_automation: false,
        enhanced_controls: false, multi_branch: false, integrations: false, custom_modules: false,
      },
    },
    {
      name: "Business", priceInPaise: 699900, maxUsers: 25, maxEnquiriesPerMonth: null, maxBranches: 1,
      entitlements: {
        enquiry_crm: true, bookings: true, quotation: true, drivers: true, vehicles: true,
        payments: true, basic_reports: true, advanced_reports: true, workflow_automation: true,
        enhanced_controls: true, multi_branch: false, integrations: false, custom_modules: false,
      },
    },
    {
      name: "Enterprise", priceInPaise: 999900, maxUsers: null, maxEnquiriesPerMonth: null, maxBranches: null,
      entitlements: {
        enquiry_crm: true, bookings: true, quotation: true, drivers: true, vehicles: true,
        payments: true, basic_reports: true, advanced_reports: true, workflow_automation: true,
        enhanced_controls: true, multi_branch: true, integrations: true, custom_modules: true,
      },
    },
  ];

  for (const def of planDefs) {
    await prisma.plan.upsert({ where: { name: def.name }, update: def, create: def });
  }

  const existingDemo = await prisma.client.findFirst({ where: { email: "owner@demotravels.test" } });
  if (!existingDemo) {
    const professionalPlan = await prisma.plan.findUniqueOrThrow({ where: { name: "Professional" } });
    const now = new Date();
    const oneYearOut = new Date(now);
    oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);

    const { client, temporaryPassword } = await provisionNewClient({
      businessName: "Demo Travels",
      ownerName: "Demo Owner",
      email: "owner@demotravels.test",
      phone: "9999999999",
      planId: professionalPlan.id,
      subscriptionStart: now,
      subscriptionExpiry: oneYearOut,
      actorId: "seed-script",
      actorEmail: superAdminEmail,
    });

    console.log(`Demo tenant created: ${client.clientCode}`);
    console.log(`Demo Client Admin login: owner@demotravels.test / ${temporaryPassword}`);
  }

  console.log("Seed complete.");
  console.log(`Super Admin login: ${superAdminEmail} / (the password you set in SEED_SUPER_ADMIN_PASSWORD)`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
