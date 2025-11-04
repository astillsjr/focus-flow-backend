import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import NudgeEngineConcept from "./NudgeEngineConcept.ts";
import { ID } from "@utils/types.ts";
import { Emotion } from "@utils/emotions.ts";

Deno.test("NudgeEngine Concept - Operational Principle & Scenarios", async (t) => {
  const [db, client] = await testDb();
  const nudgeEngine = new NudgeEngineConcept(db);
  const user = "user:Alice" as ID;
  const title = "6.1850 Writing Assignment";
  const description = "Individual writing assignment";
  const recentEmotions = [Emotion.Anxious, Emotion.Stressed, Emotion.Tired];


  await t.step("Principle: Nudge is scheduled and delivered", async () => {
    const task = "task:Essay 1" as ID;

    // 1. Schedule a new nudge for the future
    const delivery = new Date(Date.now() + 500);
    const schedule = await nudgeEngine.scheduleNudge({ 
      user, 
      task, 
      deliveryTime: delivery 
    });
    assertNotEquals(
      "error" in schedule,
      true,
      "Nudge scheduling should not fail.",
    );
    const { nudge } = schedule as { nudge: ID };

    const created = await nudgeEngine.nudges.findOne({ _id: nudge });
    assertExists(created);
    assertEquals(
      created.triggeredAt, 
      null,
      "A new nudge should not be marked as triggered"
    );

    // 2. Wait briefly so delivery time passes
    await new Promise((resolve) => setTimeout(resolve, 600));

    // 3. Trigger nudge
    const trigger = await nudgeEngine.nudgeUser({ 
      user, 
      task,
      title,
      description,
      recentEmotions,
    });
    assertNotEquals(
      "error" in trigger,
      true,
      "Nudging user should not fail.",
    );

    // 4. Ensure successful trigger
    const afterTrigger = await nudgeEngine.nudges.findOne({ _id: nudge });
    assertNotEquals(afterTrigger?.triggeredAt, null, "Nudge should have triggeredAt timestamp");
    assertExists(afterTrigger?.triggeredAt, "triggeredAt should be set after triggering");
  });

  await t.step("Action: scheduling prohibits duplicate nudges for the same task", async () => {
    const task = "task:Essay 2" as ID;

    let delivery = new Date(Date.now() + 500);
    const schedule = await nudgeEngine.scheduleNudge({ 
      user, 
      task, 
      deliveryTime: delivery 
    });
    assertNotEquals(
      "error" in schedule,
      true,
      "Nudge scheduling should not fail.",
    );

    // Try scheduling another nudge for the same task
    delivery = new Date(Date.now() + 500);
    const duplicate = await nudgeEngine.scheduleNudge({ 
      user, 
      task, 
      deliveryTime: delivery 
    });
    assertEquals(
      "error" in duplicate, 
      true, 
      "Should fail when attempting to schedule another nudge for a task."
    );
    assertEquals((duplicate as { error: string }).error, "Nudge already exists for this task");
  });

  await t.step("Action: scheduling prohibits delivery times that have already passed", async () => {
    const task = "task:Essay 3" as ID;

    // Schedule a nudge with a delivery time that has passed
    const delivery = new Date(Date.now() - 500);
    const failedSchedule = await nudgeEngine.scheduleNudge({ 
      user, 
      task, 
      deliveryTime: delivery 
    });
    assertEquals(
      "error" in failedSchedule, 
      true, 
      "Should fail when attempting to schedule a nudge with a past delivery time.",
    );
    assertEquals((failedSchedule as { error: string }).error, "Delivery time cannot be in the past");
  });

  await t.step("Action: canceling a nudge deletes it and prevents its trigger", async () => {
    const task = "task:Essay 4" as ID;

    const delivery = new Date(Date.now() + 500);
    const schedule = await nudgeEngine.scheduleNudge({ 
      user, 
      task, 
      deliveryTime: delivery 
    });
    assertNotEquals(
      "error" in schedule,
      true,
      "Nudge scheduling should not fail.",
    );

    const cancel = await nudgeEngine.cancelNudge({ user, task });
    assertNotEquals(
      "error" in cancel,
      true,
      "Nudge canceling should not fail.",
    );

    // Verify the nudge was deleted
    const deletedNudge = await nudgeEngine.nudges.findOne({ user, task });
    assertEquals(
      deletedNudge,
      null,
      "Canceled nudge should be deleted from the database."
    );

    const failedTrigger = await nudgeEngine.nudgeUser({
      user,
      task,
      title,
      description,
      recentEmotions,
    });
    assertEquals(
      "error" in failedTrigger, 
      true, 
      "Should fail when attempting to trigger a deleted nudge."
    );
    assertEquals((failedTrigger as { error: string }).error, "Nudge does not exist for this task");
  });

  await t.step("Action: canceling fails on a deleted or triggered nudge", async () => {
    let task = "task:Essay 5.1" as ID;

    let delivery = new Date(Date.now() + 500);
    let schedule = await nudgeEngine.scheduleNudge({ 
      user, 
      task, 
      deliveryTime: delivery 
    });
    assertNotEquals(
      "error" in schedule,
      true,
      "Nudge scheduling should not fail.",
    );

    const cancel = await nudgeEngine.cancelNudge({ user, task });
    assertNotEquals(
      "error" in cancel,
      true,
      "Nudge canceling should not fail.",
    );

    const failedCancel1 = await nudgeEngine.cancelNudge({ user, task });
    assertEquals(
      "error" in failedCancel1, 
      true, 
      "Should fail when attempting to cancel a deleted nudge."
    );
    assertEquals((failedCancel1 as { error: string }).error, "Nudge for this task does not exist");

    task = "task:Essay 5.2" as ID;

    delivery = new Date(Date.now() + 500);
    schedule = await nudgeEngine.scheduleNudge({ 
      user, 
      task, 
      deliveryTime: delivery 
    });
    assertNotEquals(
      "error" in schedule,
      true,
      "Nudge scheduling should not fail.",
    );

    await new Promise((resolve) => setTimeout(resolve, 600));

    const trigger = await nudgeEngine.nudgeUser({ 
      user, 
      task,
      title,
      description,
      recentEmotions,
    });
    assertNotEquals(
      "error" in trigger,
      true,
      "Nudge triggering should not fail.",
    );

    const failedCancel2 = await nudgeEngine.cancelNudge({ user, task });
    assertEquals(
      "error" in failedCancel2, 
      true, 
      "Should fail when attempting to cancel a triggered task."
    );
    assertEquals((failedCancel2 as { error: string }).error, "Nudge has already been triggered");

    // Test force cancel on triggered nudge
    const forceCancel = await nudgeEngine.cancelNudge({ user, task, force: true });
    assertNotEquals(
      "error" in forceCancel,
      true,
      "Force cancel should succeed even on triggered nudge.",
    );
    
    // Verify the nudge was deleted
    const deletedNudge = await nudgeEngine.nudges.findOne({ user, task });
    assertEquals(
      deletedNudge,
      null,
      "Force-canceled nudge should be deleted from the database.",
    );
  });

  await t.step("Action: triggering fails on preemptive and duplicate triggers", async () => {
    const task = "task:Essay 6" as ID;
    
    await nudgeEngine.scheduleNudge({
      user,
      task,
      deliveryTime: new Date(Date.now() + 3000),
    });

    // Try triggering too early
    const early = await nudgeEngine.nudgeUser({ 
      user, 
      task,
      title,
      description,
      recentEmotions,
    });
    assertEquals(
      "error" in early, 
      true,
      "Should fail when triggering a task early."
    );
    assertEquals((early as { error: string }).error, "Nudge delivery time has not arrived yet");

    // Wait and trigger again
    await new Promise((resolve) => setTimeout(resolve, 3200));
    const success = await nudgeEngine.nudgeUser({ 
      user, 
      task,
      title,
      description,
      recentEmotions,
    });
    assertNotEquals(
      "error" in success,
      true,
      "Nudge triggering should not fail.",
    );

    // Try triggering again
    const duplicate = await nudgeEngine.nudgeUser({ 
      user, 
      task,
      title,
      description,
      recentEmotions,
    });
    assertEquals(
      "error" in duplicate, 
      true,
      "Should fail when triggering a task again."
    );
    assertEquals((duplicate as { error: string }).error, "Nudge has already been triggered");
  });

  await t.step("Action: deleting user nudges removes all their nudges", async () => {
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
    assertEquals(
      "error" in delAll,
      false,
      "Deleting user's nudges should succeed.",
    );

    const remaining = await nudgeEngine.nudges.find({ user }).toArray();
    assertEquals(
      remaining.length, 
      0,
      "All nudges for user should be deleted.",
    );
  });

  await t.step("Query: getNudge retrieves a specific nudge", async () => {
    const task = "task:Essay 7" as ID;
    const delivery = new Date(Date.now() + 1000);

    const schedule = await nudgeEngine.scheduleNudge({
      user,
      task,
      deliveryTime: delivery,
    });
    assertNotEquals("error" in schedule, true, "Nudge scheduling should not fail.");
    const { nudge } = schedule as { nudge: ID };

    const retrieved = await nudgeEngine.getNudge({ user, task });
    assertNotEquals("error" in retrieved, true, "getNudge should succeed for existing nudge.");
    const nudgeDoc = retrieved as { _id: ID; triggeredAt: Date | null };
    assertEquals(nudgeDoc._id, nudge, "Retrieved nudge should match scheduled nudge.");
    assertEquals(nudgeDoc.triggeredAt, null, "Retrieved nudge should not be triggered.");

    const missing = await nudgeEngine.getNudge({ user, task: "task:Nonexistent" as ID });
    assertEquals(
      "error" in missing,
      true,
      "getNudge should fail for nonexistent nudge.",
    );
    assertEquals((missing as { error: string }).error, "Nudge for this task does not exist");
  });

  await t.step("Query: getUserNudges filters by status correctly", async () => {
    const task1 = "task:Essay 8.1" as ID;
    const task2 = "task:Essay 8.2" as ID;
    const task3 = "task:Essay 8.3" as ID;

    // Create three nudges
    await nudgeEngine.scheduleNudge({
      user,
      task: task1,
      deliveryTime: new Date(Date.now() + 500),
    });
    await nudgeEngine.scheduleNudge({
      user,
      task: task2,
      deliveryTime: new Date(Date.now() + 500),
    });
    await nudgeEngine.scheduleNudge({
      user,
      task: task3,
      deliveryTime: new Date(Date.now() + 500),
    });

    // Wait and trigger one
    await new Promise((resolve) => setTimeout(resolve, 600));
    await nudgeEngine.nudgeUser({
      user,
      task: task1,
      title,
      description,
      recentEmotions,
    });

    // Test pending filter
    const pending = await nudgeEngine.getUserNudges({ user, status: "pending" });
    const pendingForThisTest = pending.nudges.filter((n) => 
      n.task === task1 || n.task === task2 || n.task === task3
    );
    assertEquals(
      pendingForThisTest.length,
      2,
      "Should return 2 pending nudges for this test.",
    );
    assertEquals(
      pendingForThisTest.every((n) => n.triggeredAt === null),
      true,
      "All returned nudges should be pending.",
    );

    // Test triggered filter
    const triggered = await nudgeEngine.getUserNudges({ user, status: "triggered" });
    const triggeredForThisTest = triggered.nudges.filter((n) => 
      n.task === task1 || n.task === task2 || n.task === task3
    );
    assertEquals(
      triggeredForThisTest.length >= 1,
      true,
      "Should return at least 1 triggered nudge for this test.",
    );
    assertEquals(
      triggeredForThisTest.every((n) => n.triggeredAt !== null),
      true,
      "All returned nudges should be triggered.",
    );

    // Test no filter
    const all = await nudgeEngine.getUserNudges({ user });
    const allForThisTest = all.nudges.filter((n) => 
      n.task === task1 || n.task === task2 || n.task === task3
    );
    assertEquals(
      allForThisTest.length >= 3,
      true,
      "Should return all nudges when no status filter is provided.",
    );
  });

  await t.step("Query: getReadyNudges returns only ready nudges", async () => {
    const task1 = "task:Essay 9.1" as ID;
    const task2 = "task:Essay 9.2" as ID;
    const task3 = "task:Essay 9.3" as ID;

    // Create nudges - task1 and task3 will be ready soon, task2 will be in the future
    await nudgeEngine.scheduleNudge({
      user,
      task: task1,
      deliveryTime: new Date(Date.now() + 500),
    });
    await nudgeEngine.scheduleNudge({
      user,
      task: task2,
      deliveryTime: new Date(Date.now() + 5000),
    });
    await nudgeEngine.scheduleNudge({
      user,
      task: task3,
      deliveryTime: new Date(Date.now() + 500),
    });

    // Wait for delivery times to pass
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Trigger task1
    await nudgeEngine.nudgeUser({
      user,
      task: task1,
      title,
      description,
      recentEmotions,
    });

    // Now task3 should be ready (not triggered, delivery time passed)
    const ready = await nudgeEngine.getReadyNudges({ user });
    const readyForThisTest = ready.nudges.filter((n) => 
      n.task === task1 || n.task === task2 || n.task === task3
    );
    assertEquals(
      readyForThisTest.length,
      1,
      "Should return only 1 ready nudge for this test (not triggered and delivery time passed).",
    );
    assertEquals(
      readyForThisTest[0].task,
      task3,
      "Ready nudge should be task3.",
    );
  });

  await t.step("Query: getReadyNudgesSince filters by timestamp", async () => {
    const task1 = "task:Essay 10.1" as ID;
    const task2 = "task:Essay 10.2" as ID;
    
    // Schedule task1 first, then task2 slightly later
    const time1 = new Date(Date.now() + 500);
    const time2 = new Date(Date.now() + 800);

    await nudgeEngine.scheduleNudge({
      user,
      task: task1,
      deliveryTime: time1,
    });
    await nudgeEngine.scheduleNudge({
      user,
      task: task2,
      deliveryTime: time2,
    });

    // Wait for both delivery times to pass
    await new Promise((resolve) => setTimeout(resolve, 900));

    // Set sinceTimestamp to be between time1 and time2
    const sinceTimestamp = new Date(time1.getTime() + 100);

    const ready = await nudgeEngine.getReadyNudgesSince({ user, sinceTimestamp });
    const readyForThisTest = ready.nudges.filter((n) => 
      n.task === task1 || n.task === task2
    );
    // Should return task2 (delivery time after sinceTimestamp)
    assertEquals(
      readyForThisTest.length >= 1,
      true,
      "Should return at least 1 nudge after sinceTimestamp for this test.",
    );
    assertEquals(
      readyForThisTest.every((n) => n.triggeredAt === null),
      true,
      "All returned nudges should not be triggered.",
    );
  });

  await t.step("Query: getNewTriggeredNudges returns triggered nudges after timestamp", async () => {
    const task1 = "task:Essay 11.1" as ID;
    const task2 = "task:Essay 11.2" as ID;

    // Create and trigger two nudges
    await nudgeEngine.scheduleNudge({
      user,
      task: task1,
      deliveryTime: new Date(Date.now() + 500),
    });
    await nudgeEngine.scheduleNudge({
      user,
      task: task2,
      deliveryTime: new Date(Date.now() + 500),
    });

    await new Promise((resolve) => setTimeout(resolve, 600));

    const trigger1 = await nudgeEngine.nudgeUser({
      user,
      task: task1,
      title,
      description,
      recentEmotions,
    });
    assertNotEquals("error" in trigger1, true, "First trigger should succeed.");

    await new Promise((resolve) => setTimeout(resolve, 100));

    const trigger2 = await nudgeEngine.nudgeUser({
      user,
      task: task2,
      title,
      description,
      recentEmotions,
    });
    assertNotEquals("error" in trigger2, true, "Second trigger should succeed.");

    // Wait a moment to ensure triggers are processed
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    // Get timestamp before both triggers but recent enough to catch them
    const afterTimestamp = new Date(Date.now() - 500);
    const triggered = await nudgeEngine.getNewTriggeredNudges({
      user,
      afterTimestamp,
      limit: 10,
    });
    const triggeredForThisTest = triggered.nudges.filter((n) => 
      n.task === task1 || n.task === task2
    );

    // Check if we got the expected nudges (may be 1 or 2 depending on timing)
    assertEquals(
      triggeredForThisTest.length >= 1,
      true,
      "Should return at least 1 triggered nudge for this test.",
    );
    assertEquals(
      triggeredForThisTest.every((n) => n.triggeredAt !== null && n.message),
      true,
      "All returned nudges should be triggered and have messages.",
    );
  });

  await t.step("Query: getLastTriggeredTimestamp returns most recent timestamp", async () => {
    const task1 = "task:Essay 12.1" as ID;
    const task2 = "task:Essay 12.2" as ID;

    // Create and trigger nudges
    await nudgeEngine.scheduleNudge({
      user,
      task: task1,
      deliveryTime: new Date(Date.now() + 500),
    });
    await nudgeEngine.scheduleNudge({
      user,
      task: task2,
      deliveryTime: new Date(Date.now() + 500),
    });

    await new Promise((resolve) => setTimeout(resolve, 600));

    await nudgeEngine.nudgeUser({
      user,
      task: task1,
      title,
      description,
      recentEmotions,
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    await nudgeEngine.nudgeUser({
      user,
      task: task2,
      title,
      description,
      recentEmotions,
    });

    const lastTimestamp = await nudgeEngine.getLastTriggeredTimestamp({ user });
    assertNotEquals(
      lastTimestamp,
      null,
      "Should return a timestamp for user with triggered nudges.",
    );
    assertExists(lastTimestamp, "Last timestamp should exist.");
  });

  await client.close();
});