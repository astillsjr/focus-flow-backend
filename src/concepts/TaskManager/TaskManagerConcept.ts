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
  dueDate?: Date;
  completed: boolean;
}

export default class TaskManagerConcept {
  tasks: Collection<TaskDoc>;

  constructor(private readonly db: Db) {
    this.tasks = this.db.collection(PREFIX + "tasks");
  }

  /**
   * Create a new task.
   * @requires The title is not empty. The `dueDate` has not already passed.
   * @effects Creates a new task with the provided information.
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
      completed: false,
    };
    
    await this.tasks.insertOne(newTask)

    return { task: newTaskId };
  }

  /**
   * Update the content of a task.
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
    
    const existingTask = await this._getTaskForUser({ user, task });
    if ('error' in existingTask) return existingTask;
  
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
   * @requires The task belongs to the user. The task has not already been started.
   * @effects Marks the task as started at the current time.
   */
  public async markStarted(
    { user, task }: { user: User, task: Task },
  ): Promise<Empty | { error: string }> {
    const existingTask = await this._getTaskForUser({ user, task });
    if ('error' in existingTask) return existingTask;

    if (existingTask.startedAt) return { error: "Task already started" };

    await this.tasks.updateOne(
      { _id: existingTask._id },
      { $set: { startedAt: new Date() } }
    );
    
    return {};
  }
  
  /**
   * Mark a task as completed.
   * @requires The task belongs to user. The task has not already been completed.
   * @effects Marks the task as complete.
   */
  public async markComplete(
    { user, task }: { user: User, task: Task },
  ): Promise<Empty | { error: string }> {
    const existingTask = await this._getTaskForUser({ user, task });
    if ('error' in existingTask) return existingTask;

    if (existingTask.completed) return { error: "Task already complete" };

    await this.tasks.updateOne(
      { _id: existingTask._id },
      { $set: { completed: true } }
    );

    return {};
  }

  /**
   * Delete a task
   * @requires The task belongs to the user.
   * @effects Removes the task from the user's tasks.
   */
  public async deleteTask (
    { user, task }: { user: User, task: Task },
  ): Promise<Empty | { error: string }> {
    const existingTask = await this._getTaskForUser({ user, task });
    if ('error' in existingTask) return existingTask;

    await this.tasks.deleteOne({ _id: existingTask._id });

    return {};
  }

  /**
   * Fetches all tasks for a specific user.
   */
  public async getUserTasks(
    { user }: { user: User },
  ): Promise<TaskDoc[]> {
    const userTasks = this.tasks.find({ user });

    return await userTasks.toArray();
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
   * Fetches a specifc task for a user or returns an error if not found.
   */
  private async _getTaskForUser(
    { user, task }: { user: User, task: Task },
  ): Promise<TaskDoc | { error: string }> {
    const existingTask = await this.tasks.findOne({ _id: task });
    if (!existingTask) return { error: "Task does not exist" };
    if (user !== existingTask.user) return { error: "Task does not belong to user" };

    return existingTask;
  }
}