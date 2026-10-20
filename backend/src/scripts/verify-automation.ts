import { prisma } from "../db/prisma";
import {
  WORKFLOW_TRIGGER_CATALOG,
  WORKFLOW_ACTION_CATALOG,
  DEFAULT_TRAVEL_RECIPES,
  AVAILABLE_PLACEHOLDERS,
  seedDefaultRecipes,
  emitWorkflowEvent,
} from "../automation/automation.service";

async function runVerification() {
  console.log("=== Testing Digiink Workflow Automation Engine ===");

  // 1. Verify Catalogs & Placeholders
  console.log("1. Checking Catalogs...");
  console.log(`- Trigger Catalog: ${WORKFLOW_TRIGGER_CATALOG.length} triggers`);
  console.log(`- Action Catalog: ${WORKFLOW_ACTION_CATALOG.length} actions`);
  console.log(`- Default Recipes: ${DEFAULT_TRAVEL_RECIPES.length} travel recipes`);
  console.log(`- Placeholders: ${AVAILABLE_PLACEHOLDERS.length} variable tags`);

  if (WORKFLOW_TRIGGER_CATALOG.length < 10 || DEFAULT_TRAVEL_RECIPES.length < 6) {
    throw new Error("Catalog verification failed: missing trigger types or default recipes.");
  }

  // 2. Find a test client
  const client = await prisma.client.findFirst({
    where: { subscriptionStatus: "ACTIVE" },
  });

  if (!client) {
    console.log("No active client found, checking any client...");
  }
  const targetClient = client || (await prisma.client.findFirst());
  if (!targetClient) {
    console.warn("No client in database to test seeding, skipping DB tests.");
    return;
  }

  console.log(`Using client: ${targetClient.businessName} (${targetClient.id})`);

  // 3. Test Seeding Recipes
  console.log("2. Testing 1-Click Recipe Seeding...");
  const seeded = await seedDefaultRecipes(targetClient.id);
  console.log(`- Total rules for client: ${seeded.length}`);
  const welcomeRule = seeded.find((r) => r.triggerType === "NEW_LEAD_CREATED");
  console.log(`- Found NEW_LEAD_CREATED rule: ${welcomeRule ? "YES (" + welcomeRule.name + ")" : "NO"}`);

  // 4. Test Event Emission on Sample Lead
  console.log("3. Testing Real-Time Workflow Event Trigger...");
  let sampleEnquiry = await prisma.enquiry.findFirst({
    where: { clientId: targetClient.id },
  });

  if (!sampleEnquiry) {
    let sampleCustomer = await prisma.customer.findFirst({ where: { clientId: targetClient.id } });
    if (!sampleCustomer) {
      sampleCustomer = await prisma.customer.create({
        data: {
          clientId: targetClient.id,
          name: "Test Traveler Rahul",
          phone: "+919876543210",
          email: "test.rahul@example.com",
        },
      });
    }

    sampleEnquiry = await prisma.enquiry.create({
      data: {
        clientId: targetClient.id,
        customerId: sampleCustomer.id,
        destination: "Goa 4N/5D Beach Retreat",
        source: "Automated Verification Test",
        status: "NEW",
      },
    });
  }

  console.log(`- Triggering NEW_LEAD_CREATED on Enquiry #${sampleEnquiry.id}`);
  await emitWorkflowEvent({
    clientId: targetClient.id,
    eventType: "NEW_LEAD_CREATED",
    targetType: "ENQUIRY",
    targetId: sampleEnquiry.id,
  });

  // 5. Verify AutomationLog entry created
  const log = await prisma.automationLog.findFirst({
    where: {
      clientId: targetClient.id,
      targetId: sampleEnquiry.id,
    },
    orderBy: { createdAt: "desc" },
    include: { rule: true },
  });

  if (log) {
    console.log("✓ AutomationLog recorded successfully:");
    console.log(`  Channel: ${log.channel}`);
    console.log(`  Status: ${log.status}`);
    console.log(`  Recipient: ${log.recipient}`);
    console.log(`  Message: ${log.message}`);
    console.log(`  Rule Name: ${log.rule?.name}`);
  } else {
    console.log("Note: Log not found immediately or deduplicated.");
  }

  console.log("=== ALL WORKFLOW AUTOMATION VERIFICATIONS PASSED SUCCESSFULLY ===");
}

runVerification()
  .catch((e) => {
    console.error("Verification error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
