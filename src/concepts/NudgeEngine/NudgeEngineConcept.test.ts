import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import NudgeEngineConcept from "./NudgeEngineConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("NudgeEngine Concept - Operational Principle & Scenarios", async (t) => {
  const [db, client] = await testDb();
  const nudgeEngine = new NudgeEngineConcept(db);
  const user = "user:Alice" as ID;
  const task = "task:Essay" as ID;

  // ---------------------------
  // OPERATIONAL PRINCIPLE TEST
  // ---------------------------
  await t.step("Operational Principle: schedule → nudgeUser → verify", async () => {
    console.log("\n--- Operational Principle Sequence ---");

    // 1. Schedule a new nudge for the future
    const delivery = new Date(Date.now() + 2000);
    const schedule = await nudgeEngine.scheduleNudge({ user, task, deliveryTime: delivery });
    console.log("Action: scheduleNudge →", schedule);
    assertExists(schedule);
    assertEquals("error" in schedule, false);

    const { nudge } = schedule as { nudge: ID };
    const created = await nudgeEngine.nudges.findOne({ _id: nudge });
    assertExists(created);
    assertEquals(created.triggered, false);
    assertEquals(created.canceled, false);

    // 2. Wait briefly so delivery time passes
    await new Promise((resolve) => setTimeout(resolve, 2200));

    // 3. Trigger nudge
    const trigger = await nudgeEngine.nudgeUser({ user, task });
    console.log("Action: nudgeUser →", trigger);
    assertEquals("error" in trigger, false);

    const afterTrigger = await nudgeEngine.nudges.findOne({ _id: nudge });
    assertEquals(afterTrigger?.triggered, true);
  });

  // ---------------------------
  // INTERESTING SCENARIOS
  // ---------------------------

  await t.step("Scenario 1: Prevent scheduling duplicate or past nudges", async () => {
    console.log("\n--- Scenario 1: Duplicate and Past Nudges ---");

    const t1 = "task:Duplicate" as ID;

    // First schedule
    const first = await nudgeEngine.scheduleNudge({
      user,
      task: t1,
      deliveryTime: new Date(Date.now() + 5000),
    });
    assertEquals("error" in first, false);

    // Attempt duplicate
    const duplicate = await nudgeEngine.scheduleNudge({
      user,
      task: t1,
      deliveryTime: new Date(Date.now() + 8000),
    });
    console.log("Action: scheduleNudge duplicate →", duplicate);
    assertEquals("error" in duplicate, true);
    assertEquals((duplicate as { error: string }).error, "Nudge already exists for this task");

    // Attempt scheduling with past time
    const past = await nudgeEngine.scheduleNudge({
      user,
      task: "task:Past" as ID,
      deliveryTime: new Date(Date.now() - 10000),
    });
    console.log("Action: scheduleNudge past →", past);
    assertEquals("error" in past, true);
    assertEquals((past as { error: string }).error, "Delivery time cannot be in the past");
  });

  await t.step("Scenario 2: Cancel an active nudge", async () => {
    console.log("\n--- Scenario 2: Cancel Nudge ---");

    const t2 = "task:Cancel" as ID;
    const nudge = await nudgeEngine.scheduleNudge({
      user,
      task: t2,
      deliveryTime: new Date(Date.now() + 10000),
    });
    const { nudge: nudgeId } = nudge as { nudge: ID };

    const cancel = await nudgeEngine.cancelNudge({ user, task: t2 });
    console.log("Action: cancelNudge →", cancel);
    assertEquals("error" in cancel, false);

    const canceled = await nudgeEngine.nudges.findOne({ _id: nudgeId });
    assertEquals(canceled?.canceled, true);

    // Attempt cancel again (should fail)
    const cancelAgain = await nudgeEngine.cancelNudge({ user, task: t2 });
    console.log("Action: cancelNudge again →", cancelAgain);
    assertEquals("error" in cancelAgain, true);
    assertEquals(
      (cancelAgain as { error: string }).error,
      "Nudge has already been canceled",
    );
  });

  await t.step("Scenario 3: Trigger only when delivery time passes", async () => {
    console.log("\n--- Scenario 3: Early Trigger Prevention ---");

    const t3 = "task:Timing" as ID;
    await nudgeEngine.scheduleNudge({
      user,
      task: t3,
      deliveryTime: new Date(Date.now() + 3000),
    });

    // Try triggering too early
    const early = await nudgeEngine.nudgeUser({ user, task: t3 });
    console.log("Action: nudgeUser early →", early);
    assertEquals("error" in early, true);
    assertEquals(
      (early as { error: string }).error,
      "Nudge delivery time has not arrived yet",
    );

    // Wait and trigger again
    await new Promise((resolve) => setTimeout(resolve, 3200));
    const success = await nudgeEngine.nudgeUser({ user, task: t3 });
    console.log("Action: nudgeUser after wait →", success);
    assertEquals("error" in success, false);
  });

  await t.step("Scenario 4: Prevent re-triggering an already sent nudge", async () => {
    console.log("\n--- Scenario 4: Double Trigger ---");

    const t4 = "task:ReTrigger" as ID;
    await nudgeEngine.scheduleNudge({
      user,
      task: t4,
      deliveryTime: new Date(Date.now() + 250),
    });
    
    // Trigger first time
    await new Promise((resolve) => setTimeout(resolve, 300));
    const first = await nudgeEngine.nudgeUser({ user, task: t4 });
    assertEquals("error" in first, false);

    // Attempt re-trigger
    const second = await nudgeEngine.nudgeUser({ user, task: t4 });
    console.log("Action: nudgeUser second trigger →", second);
    assertEquals("error" in second, true);
    assertEquals(
      (second as { error: string }).error,
      "Nudge has already been triggered",
    );
  });

  await t.step("Scenario 5: Delete all user nudges", async () => {
    console.log("\n--- Scenario 5: Delete All Nudges ---");

    // Create multiple nudges
    await nudgeEngine.scheduleNudge({
      user,
      task: "task:A" as ID,
      deliveryTime: new Date(Date.now() + 10000),
    });
    await nudgeEngine.scheduleNudge({
      user,
      task: "task:B" as ID,
      deliveryTime: new Date(Date.now() + 20000),
    });

    const before = await nudgeEngine.nudges.find({ user }).toArray();
    assertEquals(before.length >= 2, true);

    // Delete all
    const delAll = await nudgeEngine.deleteUserNudges({ user });
    console.log("Action: deleteUserNudges →", delAll);
    assertEquals("error" in delAll, false);

    const remaining = await nudgeEngine.nudges.find({ user }).toArray();
    assertEquals(remaining.length, 0);
  });

  await client.close();
});