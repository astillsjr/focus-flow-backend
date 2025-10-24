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
 *   a description? String
 *   a createdAt Date
 *   a startedAt? Date
 *   a completedAt? Date
 *   a dueDate? Date
 */
interface TaskDoc {
  _id: Task;
  user: User;
  title: string;
  description?: string;
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
   * Creates a new task for the specified user.
   * @requires The title must be unique and non-empty.
   *           If provided, the due date must be in the future.
   * @effects Inserts a new task record for the user and returns its ID.
   */
  public async createTask(
    params: { 
      user: User; 
      title: string; 
      description?: string; 
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
   * Updates the details of an existing task.
   * @requires The task must exist and belong to the user. 
   *           Updated fields must follow the same validation rules as task creation.
   * @effects Modifies the specified fields of the task.
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
    
    const taskDoc = await this.getTask({ user, task });
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
   * Marks a task as started.
   * @requires The task must belong to the user. 
   *           The task must not already be started. 
   *           The provided start time must be in the past.
   * @effects Sets the task's `startedAt` field to the provided time.
   */
  public async markStarted(
    { user, task, timeStarted }: { user: User, task: Task, timeStarted: Date },
  ): Promise<Empty | { error: string }> {
    const taskDoc = await this.getTask({ user, task });
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
   * Marks a task as completed.
   * @requires The task must belong to the user. 
   *           The task must not already be completed.  
   *           The provided completion time must be in the past.
   * @effects Sets the task's `completedAt` field to the provided time.
   */
  public async markComplete(
    { user, task, timeCompleted }: { user: User, task: Task, timeCompleted: Date },
  ): Promise<Empty | { error: string }> {
    const taskDoc = await this.getTask({ user, task });
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
   * Deletes a single task.
   * @requires The task must belong to the user.
   * @effects Removes the specified task from the user's records.
   */
  public async deleteTask(
    { user, task }: { user: User, task: Task },
  ): Promise<Empty | { error: string }> {
    const taskDoc = await this.getTask({ user, task });
    if ('error' in taskDoc) return { error: taskDoc.error };

    await this.tasks.deleteOne({ _id: taskDoc._id });

    return {};
  }

  /**
   * Deletes all tasks for a given user.
   * @effects Removes every task associated with the user. 
   */
  public async deleteUserTasks(
    { user }: { user: User },
  ): Promise<Empty> {
    await this.tasks.deleteMany({ user });

    return {};
  }

  /**
   * Retrieves a single task by its ID.
   * @requires The task must exist and belong to the user.
   * @effects Returns the corresponding task document.
   */
  public async getTask(
    { user, task }: { user: User, task: Task }
  ): Promise<TaskDoc | { error: string }> {
    const taskDoc = await this.tasks.findOne({ _id: task });
    if (!taskDoc) return { error: "Task does not exist" };
    if (taskDoc.user !== user) return { error: "Task does not belong to user" };

    return taskDoc;
  }

  /**
   * Retrieves a paginated and optionally filtered list of tasks.
   * @effects Returns tasks matching the provided filters and pagination parameters
   */
  public async getTasks(
  {
    user,
    page = 1,
    limit = 10,
    status,
    search,
    sortBy = "createdAt",
    sortOrder = -1
  }: {
    user: User;
    page?: number;
    limit?: number;
    status?: TaskStatus;
    search?: string;
    sortBy?: keyof TaskDoc;
    sortOrder?: 1 | -1;
  }
  ): Promise<{
    tasks: TaskDoc[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

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

    // Text search (simple substring match on title/description)
    if (search) {
      filter.$text = { $search: search };
    }

    const options = search
    ? { projection: { score: { $meta: "textScore" } }, sort: { score: { $meta: "textScore" } } }
    : { sort: { [sortBy]: sortOrder } };

    const tasks = await this.tasks.find(filter, options)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    const total = await this.tasks.countDocuments({ user });
    const totalPages = Math.ceil(total / limit);

    return {
      tasks,
      total,
      page,
      totalPages
    };
  }

  /**
   * Determines the current status of a task.
   * @effects Returns `"pending"`, `"in-progress"`, or `"completed"` based on task state.
   */
  public getTaskStatus(
    { task }: { task: TaskDoc }
  ): TaskStatus {
    if (task.completedAt) return "completed";
    if (task.startedAt) return "in-progress";
    return "pending";
  }
}