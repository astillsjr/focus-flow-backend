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
      created.triggered, 
      false,
      "A new nudge should not be marked as triggered"
    );
    assertEquals(created.canceled, false);

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
    assertEquals(afterTrigger?.triggered, true);
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
      "Should fail when attempting to schedule another nudge for a task."
    );
    assertEquals((failedSchedule as { error: string }).error, "Delivery time cannot be in the past");
  });

  await t.step("Action: canceling a nudge prevents its trigger", async () => {
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
      "Should fail when attempting to trigger a canceled task."
    );
    assertEquals((failedTrigger as { error: string }).error, "Nudge has been canceled");
  });

  await t.step("Action: canceling fails on a canceled/triggered nudge", async () => {
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
      "Should fail when attempting to cancel a canceled task."
    );
    assertEquals((failedCancel1 as { error: string }).error, "Nudge has already been canceled");

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
  });

  await t.step("Action: triggering fails on preemptive and duplicate triggers", async () => {
    const task = "task:Essay 6" as ID;
    
    await nudgeEngine.scheduleNudge({
      user,
      task: task,
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
      "Nudge scheduling should not fail.",
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
      "Deleting user's task should succeed."
    );

    const remaining = await nudgeEngine.nudges.find({ user }).toArray();
    assertEquals(
      remaining.length, 
      0,
      "All tasks for user should be deleted."
    );
  });

  await client.close();
});