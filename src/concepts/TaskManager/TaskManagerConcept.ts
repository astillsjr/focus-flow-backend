import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to avoid name clashes
const PREFIX = "TaskManager" + ".";

// Generic types for the concept's external dependencies
type User = ID;

// Define the types for our entires based on the concept state
type Task = ID;
export type TaskStatus = "pending" | "in-progress" | "completed";

/**
 * a set of Tasks with
 *   a user User
 *   a title String
 *   a description String
 *   a createdAt Date
 *   a startedAt? Date
 *   a completedAt? Date
 *   a dueDate? Date
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

/**
 * @concept TaskManager
 * @purpose To create, organize, and update the tasks intended to be complete.
 */
export default class TaskManagerConcept {
  tasks: Collection<TaskDoc>;

  constructor(private readonly db: Db) {
    this.tasks = this.db.collection(PREFIX + "tasks");

    this.tasks.createIndex({ user: 1, title: 1 }, { unique: true }).catch((err) => {
      console.error("Failed to create task index:", err)
    });

    this.tasks.createIndex({ title: "text" },{ name: "TextSearchIndex" }).catch(err => { 
      console.error("Failed to create text index:", err)
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

    const taskDoc = await this.tasks.findOne({ user, title });
    if (taskDoc) return { error: "Title must be unique" };

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
   * @requires The task exists and belongs to the user. Field updates follow task creation restrictions.
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
    
    const taskDoc = await this._getTaskById({ user, task });
    if ('error' in taskDoc) return { error: taskDoc.error };
  
    if (title) {
      if (!title.trim()) return { error: "Title cannot be empty" };
      
      const duplicate = await this.tasks.findOne({ user, title });
      if (duplicate) return { error: "Title must be unique" };
    }

    if (
      dueDate !== undefined &&
      (!taskDoc.dueDate || dueDate.getTime() !== taskDoc.dueDate.getTime()) &&
      dueDate.getTime() < Date.now()
    ) {
      return { error: "Due date cannot be in the past" };
    }

    const updates: Partial<Pick<TaskDoc, "title" | "description" | "dueDate">> = {};

    if (title !== undefined && title !== taskDoc.title) updates.title = title;
    if (description !== undefined && description !== taskDoc.description) updates.description = description;
    if (
      dueDate !== undefined &&
      (!taskDoc.dueDate || dueDate.getTime() !== taskDoc.dueDate.getTime())
    ) {
      updates.dueDate = dueDate;
    }

    if (Object.keys(updates).length === 0) {
      return { task };
    }

    await this.tasks.updateOne(
      { _id: taskDoc._id },
      { $set: updates }
    );

    return { task };
  }

  /**
   * Mark a task as started.
   * @requires The task belongs to the user. The task has not already been started. The start time of the task has already passed.
   * @effects Marks the task as started.
   */
  public async markStarted(
    { user, task, timeStarted }: { user: User, task: Task, timeStarted: Date },
  ): Promise<Empty | { error: string }> {
    const taskDoc = await this._getTaskById({ user, task });
    if ('error' in taskDoc) return { error: taskDoc.error };

    if (taskDoc.startedAt) return { error: "Task already marked started" };
    if (timeStarted.getTime() > Date.now()) return { error: "Start time must have already passed" };

    await this.tasks.updateOne(
      { _id: taskDoc._id },
      { $set: { startedAt: timeStarted } }
    );
    
    return {};
  }
  
  /**
   * Mark a task as completed.
   * @requires The task belongs to the user. The task has not already been marked completed. The completion time of the task has passed.
   * @effects Marks the task as complete.
   */
  public async markComplete(
    { user, task, timeCompleted }: { user: User, task: Task, timeCompleted: Date },
  ): Promise<Empty | { error: string }> {
    const taskDoc = await this._getTaskById({ user, task });
    if ('error' in taskDoc) return { error: taskDoc.error };

    if (taskDoc.completedAt) return { error: "Task already marked complete" };
    if (timeCompleted.getTime() > Date.now()) return { error: "Completion time must already have passed" };

    await this.tasks.updateOne(
      { _id: taskDoc._id },
      { $set: { completedAt: timeCompleted } }
    );

    return {};
  }

  /**
   * Delete a task.
   * @requires The task belongs to the user.
   * @effects Removes the task from the user's tasks.
   */
  public async deleteTask(
    { user, task }: { user: User, task: Task },
  ): Promise<Empty | { error: string }> {
    const taskDoc = await this._getTaskById({ user, task });
    if ('error' in taskDoc) return { error: taskDoc.error };

    await this.tasks.deleteOne({ _id: taskDoc._id });

    return {};
  }

  /**
   * Delete all tasks for a user.
   * @effects Removes all tasks created by user. 
   */
  public async deleteUserTasks(
    { user }: { user: User },
  ): Promise<Empty> {
    await this.tasks.deleteMany({ user });

    return {};
  }

  /**
   * Fetches a user's task by its id.
   * @requires The task belongs to the user.
   * @effects Returns the task.
   */
  public async _getTaskById(
    { user, task }: { user: User, task: Task }
  ): Promise<TaskDoc | { error: string }> {
    const taskDoc = await this.tasks.findOne({ _id: task });
    if (!taskDoc) return { error: "Task does not exist" };
    if (taskDoc.user !== user) return { error: "Task does not belong to user" };

    return taskDoc;
  }

  /**
   * Fetches user's tasks that satify the constraints. 
   */
  public async _getUserTasks(
  {
    user,
    limit = 50,
    skip = 0,
    sortBy = "createdAt",
    sortOrder = -1,
    status,
    query,
    dueBefore,
    dueAfter
  }: {
    user: User;
    limit?: number;
    skip?: number;
    sortBy?: keyof TaskDoc;
    sortOrder?: 1 | -1;
    status?: TaskStatus;
    query?: string;
    dueBefore?: Date;
    dueAfter?: Date;
  }
  ): Promise<TaskDoc[]> {
    const filter: Record<string, unknown> = { user };

    // Status filtering
    if (status === "completed") {
      filter.completedAt = { $exists: true };
    } else if (status === "in-progress") {
      filter.startedAt = { $exists: true };
      filter.completedAt = { $exists: false };
    } else if (status === "pending") {
      filter.startedAt = { $exists: false };
      filter.completedAt = { $exists: false };
    }

    // Date filtering
    if (dueBefore || dueAfter) {
      const dueFilter: Record<string, Date> = {};
      if (dueBefore) dueFilter["$lt"] = dueBefore;
      if (dueAfter) dueFilter["$gt"] = dueAfter;
      filter.dueDate = dueFilter;
    }

    // Text search (simple substring match on title/description)
    if (query) {
      filter.$text = { $search: query };
    }

    const options = query
    ? { projection: { score: { $meta: "textScore" } }, sort: { score: { $meta: "textScore" } } }
    : { sort: { [sortBy]: sortOrder } };

    try {
      return await this.tasks.find(filter, options)
      .skip(skip)
      .limit(limit)
      .toArray();
    } catch (error) {
      console.error("Failed to fetch task:", error);
      return [];
    }
  }

  /**
   * Determine the status of a task.
   */
  public _getTaskStatus(task: TaskDoc): TaskStatus {
    if (task.completedAt) return "completed";
    if (task.startedAt) return "in-progress";
    return "pending";
  }
}