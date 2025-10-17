import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import TaskManagerConcept from "./TaskManagerConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("TaskManager Concept - Operational Principle & Scenarios", async (t) => {
  const [db, client] = await testDb();
  const tasks = new TaskManagerConcept(db);
  const user = "user:Alice" as ID;

  // ---------------------------
  // OPERATIONAL PRINCIPLE TEST
  // ---------------------------
  await t.step("Operational Principle: create → markStarted → markComplete → query", async () => {
    console.log("\n--- Operational Principle Sequence ---");

    // 1. Create task
    const create = await tasks.createTask({
      user,
      title: "Write reflection",
      description: "Summarize FocusFlow insights",
      dueDate: new Date(Date.now() + 1000 * 60 * 60), // +1h
    });
    console.log("Action: createTask →", create);
    assertExists(create);
    assertEquals("error" in create, false);

    const { task } = create as { task: ID };
    const created = await tasks.tasks.findOne({ _id: task });
    assertExists(created);
    assertEquals(created.title, "Write reflection");
    assertEquals(created.user, user);

    // 2. Mark task started
    const markStart = await tasks.markStarted({
      user,
      task,
      timeStarted: new Date(Date.now() - 5000),
    });
    console.log("Action: markStarted →", markStart);
    assertEquals("error" in markStart, false);

    const afterStart = await tasks.tasks.findOne({ _id: task });
    assertExists(afterStart?.startedAt);

    // 3. Mark complete
    const markDone = await tasks.markComplete({
      user,
      task,
      timeCompleted: new Date(Date.now() - 1000),
    });
    console.log("Action: markComplete →", markDone);
    assertEquals("error" in markDone, false);

    const afterComplete = await tasks.tasks.findOne({ _id: task });
    assertExists(afterComplete?.completedAt);

    // 4. Query all tasks
    const all = await tasks._getUserTasks({ user });
    console.log("Action: getUserTasks →", all);
    assertEquals(all.length >= 1, true);
  });

  // ---------------------------
  // INTERESTING SCENARIOS
  // ---------------------------

  await t.step("Scenario 1: Prevent duplicate or empty titles", async () => {
    console.log("\n--- Scenario 1: Duplicate and Empty Titles ---");

    // Create initial task
    const first = await tasks.createTask({
      user,
      title: "Plan outline",
      description: "Write a project outline",
    });
    assertEquals("error" in first, false);

    // Attempt duplicate title
    const dup = await tasks.createTask({
      user,
      title: "Plan outline",
      description: "Duplicate title",
    });
    console.log("Action: createTask duplicate →", dup);
    assertEquals("error" in dup, true);
    assertEquals((dup as { error: string }).error, "Title must be unique");

    // Attempt empty title
    const empty = await tasks.createTask({
      user,
      title: "   ",
      description: "Empty title test",
    });
    console.log("Action: createTask empty title →", empty);
    assertEquals("error" in empty, true);
    assertEquals((empty as { error: string }).error, "Title cannot be empty");
  });

  await t.step("Scenario 2: Reject past due dates", async () => {
    console.log("\n--- Scenario 2: Past Due Date ---");

    const result = await tasks.createTask({
      user,
      title: "Expired task",
      description: "Should fail",
      dueDate: new Date(Date.now() - 1000 * 60),
    });
    console.log("Action: createTask past due →", result);
    assertEquals("error" in result, true);
    assertEquals((result as { error: string }).error, "Due date cannot be in the past");
  });

  await t.step("Scenario 3: Update task fields", async () => {
    console.log("\n--- Scenario 3: Update Task Fields ---");

    const res = await tasks.createTask({
      user,
      title: "Draft section",
      description: "Section to edit later",
    });
    const { task } = res as { task: ID };

    // Update title + description
    const update = await tasks.updateTask({
      user,
      task,
      title: "Draft section updated",
      description: "Edited description",
    });
    console.log("Action: updateTask →", update);
    assertEquals("error" in update, false);

    const updated = await tasks.tasks.findOne({ _id: task });
    assertEquals(updated?.title, "Draft section updated");
    assertEquals(updated?.description, "Edited description");

    // Attempt update with invalid title
    const invalid = await tasks.updateTask({
      user,
      task,
      title: "  ",
    });
    console.log("Action: updateTask (invalid title) →", invalid);
    assertEquals("error" in invalid, true);
    assertEquals((invalid as { error: string }).error, "Title cannot be empty");
  });

  await t.step("Scenario 4: Prevent invalid start or completion times", async () => {
    console.log("\n--- Scenario 4: Invalid start/complete times ---");

    const res = await tasks.createTask({
      user,
      title: "Timing test",
      description: "Check invalid times",
    });
    const { task } = res as { task: ID };

    // Start time in the future
    const futureStart = await tasks.markStarted({
      user,
      task,
      timeStarted: new Date(Date.now() + 10000),
    });
    console.log("Action: markStarted future →", futureStart);
    assertEquals("error" in futureStart, true);
    assertEquals(
      (futureStart as { error: string }).error,
      "Start time must have already passed",
    );

    // Mark started properly
    const startOK = await tasks.markStarted({
      user,
      task,
      timeStarted: new Date(Date.now() - 1000),
    });
    assertEquals("error" in startOK, false);

    // Completion time in future
    const futureComplete = await tasks.markComplete({
      user,
      task,
      timeCompleted: new Date(Date.now() + 10000),
    });
    console.log("Action: markComplete future →", futureComplete);
    assertEquals("error" in futureComplete, true);
    assertEquals(
      (futureComplete as { error: string }).error,
      "Completion time must already have passed",
    );
  });

  await t.step("Scenario 5: Delete single and all user tasks", async () => {
    console.log("\n--- Scenario 5: Delete Tasks ---");

    const res1 = await tasks.createTask({
      user,
      title: "Delete me 1",
      description: "Test task",
    });
    const res2 = await tasks.createTask({
      user,
      title: "Delete me 2",
      description: "Another test task",
    });

    const { task: t1 } = res1 as { task: ID };
    const { task: t2 } = res2 as { task: ID };

    // Delete one
    const del1 = await tasks.deleteTask({ user, task: t1 });
    console.log("Action: deleteTask →", del1);
    assertEquals("error" in del1, false);

    const afterDelete1 = await tasks.tasks.findOne({ _id: t1 });
    assertEquals(afterDelete1, null);

    // Delete all user tasks
    const delAll = await tasks.deleteUserTasks({ user });
    console.log("Action: deleteUserTasks →", delAll);

    const remaining = await tasks._getUserTasks({ user });
    assertEquals(remaining.length, 0);
  });

  await client.close();
});