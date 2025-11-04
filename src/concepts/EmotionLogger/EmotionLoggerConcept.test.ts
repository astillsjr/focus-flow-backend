import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
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
    const stats = await emotions.getEmotionStats({ user });
    assertEquals("error" in stats, false, "Should return trends, not error.");

    const {
      totalLogs,
      mostCommonEmotion,
      leastCommonEmotion,
      averageEmotionsPerDay,
      recentTrend,
    } = stats as {
      totalLogs: number;
      mostCommonEmotion: Emotion | null;
      leastCommonEmotion: Emotion | null;
      averageEmotionsPerDay: number;
      recentTrend: "improving" | "declining" | "stable" | "insufficient_data";
    };

    // Total logs should be 2
    assertEquals(totalLogs, 2, "Total number of emotion logs should be 2.");

    // Most and least common emotions should be... 
    assertEquals(mostCommonEmotion, Emotion.Motivated, "Most common emotion should be 'motivated'.");
    assertEquals(leastCommonEmotion, Emotion.Anxious, "Least common emotion should be 'anxious'.");

    // Average emotions per day should be 2 (2 logs in 1 day)
    assertEquals(averageEmotionsPerDay, 2, "Average emotions per day should be 2.");
    assertEquals(recentTrend, "insufficient_data", "Recent trend should be insufficient_data with only 2 logs.");
  });

  await t.step("Action: logging prohibits duplicates in the same phase", async () => {
    const dup = await emotions.logBefore({
      user,
      task,
      emotion: Emotion.Neutral,
    });
    assertEquals(
      "error" in dup,
      true,
      "Logging duplicate before emotion should fail.",
    );
    assertEquals(
      (dup as { error: string }).error,
      "A log in the before phase already exists for this task",
    );
  });

  await t.step("Action: delete task logs removes all logs for a task", async () => {
    const beforeDelete = await emotions.logs.find({ user, task }).toArray();
    assertEquals(
      beforeDelete.length,
      2,
      "Should have 2 logs before deletion.",
    );

    const del = await emotions.deleteTaskLogs({ user, task });
    assertEquals(
      "error" in del,
      false,
      "deleteTaskLogs should succeed.",
    );

    const afterDelete = await emotions.logs.find({ user, task }).toArray();
    assertEquals(
      afterDelete.length,
      0,
      "All logs for the task should be deleted.",
    );
  });

  await t.step("Action: trends should fail with no logs", async () => {
    const result = await emotions.getEmotionStats({
      user: "user:Ghost" as ID,
    });
    assertEquals(
      "error" in result,
      true,
      "getEmotionStats should fail for user with no logs.",
    );
    assertEquals(
      (result as { error: string }).error,
      "No emotion logs found",
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
    assertEquals(
      beforeDel.length,
      6,
      "Should have 6 logs before deletion (3 tasks × 2 phases).",
    );

    const del = await emotions.deleteUserLogs({ user });
    assertEquals(
      "error" in del,
      false,
      "deleteUserLogs should succeed.",
    );

    const afterDel = await emotions.logs.find({ user }).toArray();
    assertEquals(
      afterDel.length,
      0,
      "All user logs should be deleted.",
    );
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

    assertEquals(
      "error" in beforeLiam,
      false,
      "Logging before emotion for different user should succeed.",
    );
    assertEquals(
      "error" in afterLiam,
      false,
      "Logging after emotion for different user should succeed.",
    );

    const liamLogs = await emotions.logs.find({ user: user2 }).toArray();
    assertEquals(
      liamLogs.length,
      2,
      "User2 should have 2 logs.",
    );
    assertEquals(
      liamLogs[0].user,
      user2,
      "All logs should belong to user2.",
    );
  });

  await t.step("Query: getEmotionsForTask returns emotions for a specific task", async () => {
    const testUser = "user:Test" as ID;
    const testTask = "task:Test" as ID;

    await emotions.logBefore({
      user: testUser,
      task: testTask,
      emotion: Emotion.Dreading,
    });
    await emotions.logAfter({
      user: testUser,
      task: testTask,
      emotion: Emotion.Motivated,
    });

    const result = await emotions.getEmotionsForTask({ user: testUser, task: testTask });
    assertEquals(
      result.task,
      testTask,
      "Returned task should match requested task.",
    );
    assertEquals(
      result.emotions.before,
      Emotion.Dreading,
      "Before emotion should match logged emotion.",
    );
    assertEquals(
      result.emotions.after,
      Emotion.Motivated,
      "After emotion should match logged emotion.",
    );
  });

  await t.step("Query: getEmotionLogs returns paginated and filtered logs", async () => {
    const testUser = "user:Pagination" as ID;
    const tasks = ["task:1", "task:2", "task:3"] as ID[];

    // Create multiple logs
    for (const task of tasks) {
      await emotions.logBefore({
        user: testUser,
        task,
        emotion: Emotion.Neutral,
      });
      await emotions.logAfter({
        user: testUser,
        task,
        emotion: Emotion.Motivated,
      });
    }

    // Test pagination
    const page1 = await emotions.getEmotionLogs({
      user: testUser,
      page: 1,
      limit: 3,
    });
    assertNotEquals(
      "error" in page1,
      true,
      "getEmotionLogs should succeed.",
    );
    const page1Result = page1 as { logs: { _id: ID }[]; total: number; page: number; totalPages: number };
    assertEquals(
      page1Result.logs.length,
      3,
      "First page should return 3 logs.",
    );
    assertEquals(
      page1Result.total,
      6,
      "Total logs should be 6.",
    );
    assertEquals(
      page1Result.page,
      1,
      "Page number should be 1.",
    );

    // Test filtering by phase
    const beforeLogs = await emotions.getEmotionLogs({
      user: testUser,
      phase: "before",
    });
    assertNotEquals(
      "error" in beforeLogs,
      true,
      "Filtering by phase should succeed.",
    );
    const beforeResult = beforeLogs as { logs: { phase: string }[] };
    assertEquals(
      beforeResult.logs.every((log) => log.phase === "before"),
      true,
      "All logs should be in 'before' phase.",
    );

    // Test filtering by emotion
    const motivatedLogs = await emotions.getEmotionLogs({
      user: testUser,
      emotion: Emotion.Motivated,
    });
    assertNotEquals(
      "error" in motivatedLogs,
      true,
      "Filtering by emotion should succeed.",
    );
    const motivatedResult = motivatedLogs as { logs: { emotion: Emotion }[] };
    assertEquals(
      motivatedResult.logs.every((log) => log.emotion === Emotion.Motivated),
      true,
      "All logs should have 'motivated' emotion.",
    );
  });

  await t.step("Query: analyzeRecentEmotions generates AI analysis", async () => {
    const testUser = "user:Analysis" as ID;
    const testTask = "task:Analysis" as ID;

    // Create some logs for analysis
    await emotions.logBefore({
      user: testUser,
      task: testTask,
      emotion: Emotion.Anxious,
    });
    await emotions.logAfter({
      user: testUser,
      task: testTask,
      emotion: Emotion.Motivated,
    });

    const result = await emotions.analyzeRecentEmotions({ user: testUser });
    assertNotEquals(
      "error" in result,
      true,
      "analyzeRecentEmotions should succeed with logs present.",
    );
    const analysisResult = result as { analysis: string };
    assertNotEquals(
      analysisResult.analysis.length,
      0,
      "Analysis should not be empty.",
    );
    assertNotEquals(
      analysisResult.analysis,
      "",
      "Analysis should contain text.",
    );

    // Test with no logs
    const noLogsResult = await emotions.analyzeRecentEmotions({
      user: "user:NoLogs" as ID,
    });
    assertEquals(
      "error" in noLogsResult,
      true,
      "analyzeRecentEmotions should fail for user with no logs.",
    );
    assertEquals(
      (noLogsResult as { error: string }).error,
      "No recent emotion logs found for this user.",
    );
  });

  await client.close();
});