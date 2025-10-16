import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to avoid name clashes
const PREFIX = "TaskManager" + ".";

// Generic types for the concept's external dependencies
type User = ID;

// Define the types for our entires based on the concept state
type Task = ID;

/**
 * a set of Tasks with
 *   a user User
 *   a title String
 *   a description String
 *   a createdAt Date
 *   a startedAt? Date
 *   a dueDate? Date
 *   a completed Boolean
 */
interface TaskDoc {
  _id: Task;
  user: User;
  title: string;
  description: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  dueDate?: Date;
}

export default class TaskManagerConcept {
  tasks: Collection<TaskDoc>;

  constructor(private readonly db: Db) {
    this.tasks = this.db.collection(PREFIX + "tasks");

    this.tasks.createIndex(
      { user: 1, title: 1 }, 
      { unique: true }
    ).catch((err) => {
      console.error("Failed to create unique index on TaskManager tasks:", err);
    });
  }

  /**
   * Create a new task.
   * @requires The title is unique and nonempty. The due date is after the current time.
   * @effects Creates a new task for the user.
   */
  public async createTask(
    params: { 
      user: User; 
      title: string; 
      description: string; 
      dueDate?: Date;
    }
  ): Promise<{ task: Task } | { error: string }> {
    const { user, title, description, dueDate } = params;

    if (!title.trim()) {
      return { error: "Title cannot be empty" };
    }

    const existingTask = await this.tasks.findOne({ user, title });
    if (existingTask) return { error: "Title must be unique" };

    if (dueDate && dueDate.getTime() < Date.now()) {
      return { error: "Due date cannot be in the past" };
    }

    const newTaskId = freshID();
    const newTask: TaskDoc = {
      _id: newTaskId,
      user,
      title,
      description,
      createdAt: new Date(),
      dueDate,
    };
    
    await this.tasks.insertOne(newTask)

    return { task: newTaskId };
  }

  /**
   * Update the contents of a task.
   * @requires The task exists and belongs to user.
   * @effects Updates the fields of the task.
   */
  public async updateTask(
    params: { 
      user: User; 
      task: Task; 
      title?: string; 
      description?: string; 
      dueDate?: Date;
    }
  ): Promise<{ task: Task } | { error: string }> {
    const { user, task, title, description, dueDate } = params;
    
    const existingTask = await this.getTaskForUser({ user, task });
    if ('error' in existingTask) return { error: existingTask.error };
  
    if (title !== undefined && !title.trim()) {
      return { error: "Title cannot be empty" };
    }

    if (
      dueDate !== undefined &&
      (!existingTask.dueDate || dueDate.getTime() !== existingTask.dueDate.getTime()) &&
      dueDate.getTime() < Date.now()
    ) {
      return { error: "Due date cannot be in the past" };
    }

    const updates: Partial<Pick<TaskDoc, "title" | "description" | "dueDate">> = {};

    if (title !== undefined && title !== existingTask.title) updates.title = title;
    if (description !== undefined && description !== existingTask.description) updates.description = description;
    if (
      dueDate !== undefined &&
      (!existingTask.dueDate || dueDate.getTime() !== existingTask.dueDate.getTime())
    ) {
      updates.dueDate = dueDate;
    }

    if (Object.keys(updates).length === 0) {
      return { task };
    }

    await this.tasks.updateOne(
      { _id: existingTask._id },
      { $set: updates }
    );

    return { task };
  }

  /**
   * Mark a task as started.
   * @requires The task belongs to the user. The task has not already been started. The start time of the task is prior to the current time.
   * @effects Marks the task as started at the provided start time.
   */
  public async markStarted(
    { user, task, timeStarted }: { user: User, task: Task, timeStarted: Date },
  ): Promise<Empty | { error: string }> {
    const existingTask = await this.getTaskForUser({ user, task });
    if ('error' in existingTask) return { error: existingTask.error };

    if (existingTask.startedAt) return { error: "Task already marked started" };
    if (timeStarted.getTime() > Date.now()) return { error: "Start time must have already passed" };

    await this.tasks.updateOne(
      { _id: existingTask._id },
      { $set: { startedAt: new Date() } }
    );
    
    return {};
  }
  
  /**
   * Mark a task as completed.
   * @requires The task belongs to the user. The task has not already been completed. The complete time of the task is prior to the current time.
   * @effects Marks the task as completed at the provided completion time.
   */
  public async markComplete(
    { user, task, timeCompleted }: { user: User, task: Task, timeCompleted: Date },
  ): Promise<Empty | { error: string }> {
    const existingTask = await this.getTaskForUser({ user, task });
    if ('error' in existingTask) return { error: existingTask.error };

    if (existingTask.completedAt) return { error: "Task already marked complete" };
    if (timeCompleted.getTime() > Date.now()) return { error: "Completion time must already have passed" };

    await this.tasks.updateOne(
      { _id: existingTask._id },
      { $set: { completedAt: timeCompleted } }
    );

    return {};
  }

  /**
   * Delete a task.
   * @requires The task belongs to the user.
   * @effects Removes the task from the user's tasks.
   */
  public async deleteTask (
    { user, task }: { user: User, task: Task },
  ): Promise<Empty | { error: string }> {
    const existingTask = await this.getTaskForUser({ user, task });
    if ('error' in existingTask) return { error: existingTask.error };

    await this.tasks.deleteOne({ _id: existingTask._id });

    return {};
  }

  /**
   * Delete all tasks for a user.
   * @effects Removes all tasks created by the specified user. 
   */
  public async deleteUserTasks (
    { user }: { user: User },
  ): Promise<Empty> {
    await this.tasks.deleteMany({ user });

    return {};
  }

  /**
   * Fetches all tasks for a specific user.
   */
  public async _getUserTasks(
    { user }: { user: User },
  ): Promise<TaskDoc[]> {
    const userTasks = this.tasks.find({ user });

    return await userTasks.toArray();
  }

  /**
   * Fetches a specifc task for a user or returns an error if not found.
   */
  private async getTaskForUser(
    { user, task }: { user: User, task: Task },
  ): Promise<TaskDoc | { error: string }> {
    const existingTask = await this.tasks.findOne({ _id: task });
    if (!existingTask) return { error: "Task does not exist" };
    if (user !== existingTask.user) return { error: "Task does not belong to user" };

    return existingTask;
  }
}