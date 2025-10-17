import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import EmotionLoggerConcept from "./EmotionLoggerConcept.ts";
import { ID } from "@utils/types.ts";
import { Emotion } from "@utils/emotions.ts";

Deno.test("EmotionLogger Concept - Operational Principle & Scenarios", async (t) => {
  const [db, client] = await testDb();
  const emotions = new EmotionLoggerConcept(db);
  const user = "user:Emma" as ID;
  const task = "task:Essay" as ID;

  // ---------------------------
  // OPERATIONAL PRINCIPLE TEST
  // ---------------------------
  await t.step("Operational Principle: logBefore → logAfter → viewEmotionTrends", async () => {
    console.log("\n--- Operational Principle Sequence ---");

    // 1. Log "before" emotion
    const before = await emotions.logBefore({
      user,
      task,
      emotion: Emotion.Anxious,
    });
    console.log("Action: logBefore →", before);
    assertEquals("error" in before, false);

    const { log: beforeId } = before as { log: ID };
    const beforeDoc = await emotions.logs.findOne({ _id: beforeId });
    assertExists(beforeDoc);
    assertEquals(beforeDoc.emotion, "anxious");

    // 2. Log "after" emotion
    const after = await emotions.logAfter({
      user,
      task,
      emotion: Emotion.Motivated,
    });
    console.log("Action: logAfter →", after);
    assertEquals("error" in after, false);

    const { log: afterId } = after as { log: ID };
    const afterDoc = await emotions.logs.findOne({ _id: afterId });
    assertExists(afterDoc);
    assertEquals(afterDoc.emotion, "motivated");

    // 3. View trends
    const trends = await emotions.viewEmotionTrends({ user });
    console.log("Action: viewEmotionTrends →", trends);
    assertEquals("error" in trends, false);
    assertEquals(
      (trends as { trends: string }).trends,
      "Trend analysis not implemented yet",
    );
  });

  // ---------------------------
  // INTERESTING SCENARIOS
  // ---------------------------

  await t.step("Scenario 1: Prevent duplicate logs in same phase", async () => {
    console.log("\n--- Scenario 1: Duplicate Logs ---");

    const dup = await emotions.logBefore({
      user,
      task,
      emotion: Emotion.Neutral,
    });
    console.log("Action: logBefore duplicate →", dup);
    assertEquals("error" in dup, true);
    assertEquals(
      (dup as { error: string }).error,
      "A log in the before phase already exists for this task",
    );
  });

  await t.step("Scenario 2: Delete task logs", async () => {
    console.log("\n--- Scenario 2: Delete Task Logs ---");

    const beforeDelete = await emotions.logs.find({ user, task }).toArray();
    assertEquals(beforeDelete.length, 2);

    const del = await emotions.deleteTaskLogs({ user, task });
    console.log("Action: deleteTaskLogs →", del);
    assertEquals("error" in del, false);

    const afterDelete = await emotions.logs.find({ user, task }).toArray();
    assertEquals(afterDelete.length, 0);
  });

  await t.step("Scenario 3: Handle trends for users with no logs", async () => {
    console.log("\n--- Scenario 3: Trends Without Logs ---");

    const result = await emotions.viewEmotionTrends({
      user: "user:Ghost" as ID,
    });
    console.log("Action: viewEmotionTrends (no logs) →", result);
    assertEquals("error" in result, true);
    assertEquals(
      (result as { error: string }).error,
      "No logs for this user",
    );
  });

  await t.step("Scenario 4: Delete all logs for a user", async () => {
    console.log("\n--- Scenario 4: Delete All User Logs ---");

    // Add multiple tasks
    const taskList = ["task:A", "task:B", "task:C"];
    for (const tsk of taskList) {
      await emotions.logBefore({
        user,
        task: tsk as ID,
        emotion: Emotion.Neutral,
      });
      await emotions.logAfter({
        user,
        task: tsk as ID,
        emotion: Emotion.Motivated,
      });
    }

    const beforeDel = await emotions.logs.find({ user }).toArray();
    assertEquals(beforeDel.length, 6);

    const del = await emotions.deleteUserLogs({ user });
    console.log("Action: deleteUserLogs →", del);
    assertEquals("error" in del, false);

    const afterDel = await emotions.logs.find({ user }).toArray();
    assertEquals(afterDel.length, 0);
  });

  await t.step("Scenario 5: Log multiple users independently", async () => {
    console.log("\n--- Scenario 5: Multiple Users ---");

    const user2 = "user:Liam" as ID;
    const task2 = "task:Study" as ID;

    const beforeLiam = await emotions.logBefore({
      user: user2,
      task: task2,
      emotion: Emotion.Dreading,
    });
    const afterLiam = await emotions.logAfter({
      user: user2,
      task: task2,
      emotion: Emotion.Neutral,
    });

    console.log("User 2 actions:", beforeLiam, afterLiam);
    assertEquals("error" in beforeLiam, false);
    assertEquals("error" in afterLiam, false);

    const liamLogs = await emotions.logs.find({ user: user2 }).toArray();
    assertEquals(liamLogs.length, 2);
    assertEquals(liamLogs[0].user, user2);
  });

  await client.close();
});