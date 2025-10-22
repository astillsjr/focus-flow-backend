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

  await t.step("Principle: User logs emotion before and after a task, views their trends", async () => {
    // 1. Log "before" emotion
    const before = await emotions.logBefore({
      user,
      task,
      emotion: Emotion.Anxious,
    });
    assertEquals(
      "error" in before, 
      false,
      "Logging before a task should succeed."
    );

    const { log: beforeId } = before as { log: ID };
    const beforeDoc = await emotions.logs.findOne({ _id: beforeId });
    assertExists(beforeDoc);
    assertEquals(
      beforeDoc.emotion, 
      "anxious",
      "Incorrect emotion logging for before task log."
    );

    // 2. Log "after" emotion
    const after = await emotions.logAfter({
      user,
      task,
      emotion: Emotion.Motivated,
    });
    assertEquals(
      "error" in after, 
      false,
      "Logging after a task should succeed."
    );

    const { log: afterId } = after as { log: ID };
    const afterDoc = await emotions.logs.findOne({ _id: afterId });
    assertExists(afterDoc);
    assertEquals(
      afterDoc.emotion, 
      "motivated",
      "Incorrect emotion logging for after task log."
    );

    // 3. View trends
    const trendsResult = await emotions.viewEmotionTrends({ user });
    assertEquals("error" in trendsResult, false, "Should return trends, not error.");

    const { trends } = trendsResult as {
      trends: {
        total: number;
        counts: Partial<Record<Emotion, number>>;
        byPhase: Record<"before" | "after", Partial<Record<Emotion, number>>>;
        recentEmotions: { phase: "before" | "after"; emotion: Emotion; createdAt: Date }[];
      };
    };

    // Total logs should be 2
    assertEquals(trends.total, 2, "Total number of emotion logs should be 2.");

    // Emotion counts should reflect 1 anxious and 1 motivated
    assertEquals(trends.counts.anxious, 1, "Anxious count should be 1.");
    assertEquals(trends.counts.motivated, 1, "Motivated count should be 1.");

    // Phase breakdown should match
    assertEquals(trends.byPhase.before.anxious, 1, "'Before' phase should have 1 anxious.");
    assertEquals(trends.byPhase.after.motivated, 1, "'After' phase should have 1 motivated.");

    // Recent emotions should include both logs (in descending order of createdAt)
    assertEquals(trends.recentEmotions.length, 2, "Should return 2 recent emotions.");
    const recentPhases = trends.recentEmotions.map(e => e.phase);
    const recentEmotions = trends.recentEmotions.map(e => e.emotion);
    assertEquals(new Set(recentPhases), new Set(["before", "after"]), "Recent emotions should include both phases.");
    assertEquals(new Set(recentEmotions), new Set(["anxious", "motivated"]), "Recent emotions should include both emotions.");
  });

  await t.step("Action: logging prohibits duplicates in the same phase", async () => {
    const dup = await emotions.logBefore({
      user,
      task,
      emotion: Emotion.Neutral,
    });
    assertEquals("error" in dup, true);
    assertEquals(
      (dup as { error: string }).error,
      "A log in the before phase already exists for this task",
    );
  });

  await t.step("Action: delete task logs removes all logs for a task", async () => {
    const beforeDelete = await emotions.logs.find({ user, task }).toArray();
    assertEquals(beforeDelete.length, 2);

    const del = await emotions.deleteTaskLogs({ user, task });
    assertEquals("error" in del, false);

    const afterDelete = await emotions.logs.find({ user, task }).toArray();
    assertEquals(afterDelete.length, 0);
  });

  await t.step("Action: trends should fail with no logs", async () => {
    const result = await emotions.viewEmotionTrends({
      user: "user:Ghost" as ID,
    });
    assertEquals("error" in result, true);
    assertEquals(
      (result as { error: string }).error,
      "No logs for this user",
    );
  });

  await t.step("Action: Delete user logs should remove all the user's logs", async () => {
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
    assertEquals("error" in del, false);

    const afterDel = await emotions.logs.find({ user }).toArray();
    assertEquals(afterDel.length, 0);
  });

  await t.step("Action: multiple users should log freely", async () => {
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

    assertEquals("error" in beforeLiam, false);
    assertEquals("error" in afterLiam, false);

    const liamLogs = await emotions.logs.find({ user: user2 }).toArray();
    assertEquals(liamLogs.length, 2);
    assertEquals(liamLogs[0].user, user2);
  });

  await client.close();
});