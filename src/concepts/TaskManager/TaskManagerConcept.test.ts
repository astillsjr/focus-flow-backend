import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import TaskManagerConcept from "./TaskManagerConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("TaskManager Concept - Operational Principle & Scenarios", async (t) => {
  const [db, client] = await testDb();
  const tasks = new TaskManagerConcept(db);
  const user = "user:Alice" as ID;

  await t.step("Principle: User creates a task, updates it, starts it, completes it, views their tasks", async () => {
    // 1. Create task
    const create = await tasks.createTask({
      user,
      title: "Write reflection",
      description: "Summarize FocusFlow insights",
      dueDate: new Date(Date.now() + 1000 * 60 * 60), 
    });
    assertNotEquals(
      "error" in create,
      true,
      "Task creation should not fail.",
    );

    const { task } = create as { task: ID };
    const created = await tasks.tasks.findOne({ _id: task });
    assertExists(created);
    assertEquals(created.title, "Write reflection");
    assertEquals(created.user, user);

    // 2. Update the task
    const update = await tasks.updateTask({
      user,
      task,
      title: "Summarize reflection",
      dueDate: new Date(Date.now() + 1000 * 60 * 60),
    });
    assertNotEquals(
      "error" in update,
      true,
      "Updating the task should not fail.",
    );

    // 3. Mark task started
    const markStart = await tasks.markStarted({
      user,
      task,
      timeStarted: new Date(Date.now() - 5000),
    });
    assertNotEquals(
      "error" in markStart,
      true,
      "Marking task as started should not fail.",
    );

    const afterStart = await tasks.tasks.findOne({ _id: task });
    assertExists(afterStart);
    assertExists(afterStart.startedAt);

    // 4. Mark task complete
    const markDone = await tasks.markComplete({
      user,
      task,
      timeCompleted: new Date(Date.now() - 1000),
    });
    assertNotEquals(
      "error" in markDone,
      true,
      "Marking task as complete should succeed.",
    );

    const afterComplete = await tasks.tasks.findOne({ _id: task });
    assertExists(afterComplete);
    assertExists(afterComplete.completedAt);

    // 5. Query for all tasks
    const all = await tasks.getTasks({ user });
    assertEquals(
      all.total >= 1,
      true,
      "Task query should return at least one task."
    );
  });

  await t.step("Action: task creation/updating prohibits duplicate and empty titles", async () => {
    // Create initial tasks
    const _first = await tasks.createTask({
      user,
      title: "Plan outline",
      description: "Write a project outline",
    });

    const second = await tasks.createTask({
      user,
      title: "Plan rough draph",
      description: "Write a project rough draft",
    });
    const { task: dupExample } = second as { task: ID };

    // Attempt duplicate title
    const dupTitleCreation = await tasks.createTask({
      user,
      title: "Plan outline",
      description: "Duplicate title",
    });

    assertEquals(
      "error" in dupTitleCreation, 
      true, 
      "Should fail when creating a task with duplicate name."
    );
    assertEquals((dupTitleCreation as { error: string }).error, "Title must be unique");

    const dupTitleUpdate = await tasks.updateTask({
      user,
      task: dupExample,
      title: "Plan outline",
    });

    assertEquals(
      "error" in dupTitleUpdate, 
      true, 
      "Should fail when updating task with duplicate name."
    );
    assertEquals((dupTitleCreation as { error: string }).error, "Title must be unique");

    // Attempt empty title
    const empty = await tasks.createTask({
      user,
      title: "   ",
      description: "Empty title test",
    });
    assertEquals(
      "error" in empty, 
      true,
      "Should fail when attempting an empty title."
    );
    assertEquals((empty as { error: string }).error, "Title cannot be empty");
  });

  await t.step("Action: task creation/updating prohibits elapsed due dates", async () => {
    const createFailure = await tasks.createTask({
      user,
      title: "Expired task",
      description: "Should fail",
      dueDate: new Date(Date.now() - 1000 * 60),
    });
    assertEquals(
      "error" in createFailure, 
      true,
      "Should fail when creating a task with a due date that has already passed."
    );
    assertEquals((createFailure as { error: string }).error, "Due date cannot be in the past");

    const success = await tasks.createTask({
      user,
      title: "Normal task",
      description: "Nothing wrong",
      dueDate: new Date(Date.now() + 1000 * 60)
    });
    const { task } = success as { task: ID };

    const updateFailure = await tasks.updateTask({
      user,
      task,
      dueDate: new Date(Date.now() - 1000 * 60)
    });
    assertEquals(
      "error" in updateFailure, 
      true,
      "Should fail when updating a task to a due date that has already passed."
    );
    assertEquals((updateFailure as { error: string }).error, "Due date cannot be in the past");
  });

  await t.step("Action: delete task fails for incorrect user or nonexistant task", async () => {
    const res = await tasks.createTask({
      user,
      title: "Draft section",
      description: "Section to edit later",
    });
    const { task } = res as { task: ID };

    const wrongUser = await tasks.deleteTask({
      user: "user:Ghost" as ID,
      task,
    });
    assertEquals(
      "error" in wrongUser, 
      true,
      "Should fail when deleting a task that doesn't belong to the user."
    );
    assertEquals((wrongUser as { error: string }).error, "Task does not belong to user");

    const imaginaryTask = await tasks.deleteTask({
      user,
      task: "imaginaryTaskId" as ID,
    });
    assertEquals(
      "error" in imaginaryTask, 
      true,
      "Should fail when deleting a task that doesn't exist."
    );
    assertEquals((imaginaryTask as { error: string }).error, "Task does not exist");
  });

  await t.step("Query: correctly identifying a task's status", async () => {
    const example = await tasks.createTask({
      user,
      title: "Status test",
      description: "Validate the task's status",
    }) as { task: ID };
    let exampleTask = await tasks.getTask({ user, task: example.task});
    if ("error" in exampleTask) throw new Error("Query for existing task should succeed.");

    assertEquals(
      tasks.getTaskStatus(exampleTask), 
      "pending",
      "Correct query for pending task status should succeed." 
    )

    await tasks.markStarted({
      user,
      task: example.task,
      timeStarted: new Date(Date.now() - 100),
    });
    exampleTask = await tasks.getTask({ user, task: example.task});
    if ("error" in exampleTask) throw new Error("Query for existing task should succeed.");
    assertEquals(
      tasks.getTaskStatus(exampleTask), 
      "in-progress",
      "Correct query for in-progress task status should succeed." 
    )

    await tasks.markComplete({
      user,
      task: example.task,
      timeCompleted: new Date(Date.now() - 100),
    });
    exampleTask = await tasks.getTask({ user, task: example.task});
    if ("error" in exampleTask) throw new Error("Query for existing task should succeed.");
    assertEquals(
      tasks.getTaskStatus(exampleTask), 
      "completed",
      "Correct query for completed task status should succeed." 
    )
  });

  await client.close();
});