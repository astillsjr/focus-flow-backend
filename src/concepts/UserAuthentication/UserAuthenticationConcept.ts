import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "UserAuthentication" + ".";

// Define the types for our entires based on the concept state
type User = ID;

/**
 * a set of Users with
 *   a username String
 *   a passwordHash String
 *   a email String
 *   a isLoggedIn Boolean
 */
interface UserDoc {
  _id: User;
  username: string;
  hashedPassword: string;
  email: string;
  isLoggedIn: boolean;
}

/**
 * @concept UserAuthentication
 * @purpose To authenticate users so that each person’s data is securely associated with their identity and protected from unauthorized access.
 */
export default class UserAuthenticationConcept {
  users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");

    this.users.createIndex(
      { username: 1 }, 
      { unique: true }
    ).catch((err) => {
      console.error("Failed to create unique index on UserAuthentication users:", err);
    });
  }

  /**
   * Register a new user account.
   * @requires The username not already taken.
   * @effects Creates a new user with the provided username and password and logs in.
   */
  public async register(
    { username, password, email }: { username: string; password: string; email: string  },
  ): Promise<{ user: User } | { error: string }> {
    const query = { username };
    const existingUser = await this.users.findOne(query);
    if (existingUser) return { error: "Username already taken" };

    if (!this.isValidEmail(email)) return { error: "Invalid email format" };

    const newUserId = freshID();
    const hashedPassword = this.hashPassword(password);
    const newUser: UserDoc = {
      _id: newUserId,
      username,
      hashedPassword,
      email,
      isLoggedIn: true,
    }

    await this.users.insertOne(newUser);

    return { user: newUserId };
  }

  /**
   * Authenticate a user by verifying their credentials.
   * @requires The user with matching username and password exists.
   * @effects Sets the user's status to logged in.
   */
  public async login(
    { username, password }: { username: string; password: string; }, 
  ): Promise<{ user: User } | { error: string }> {
    const query = { username };
    const existingUser = await this.users.findOne(query);
    if (!existingUser) return { error: "Invalid username or password" };

    if (!this.verifyPassword(password, existingUser.hashedPassword)) return { error: "Invalid username or password" };

    await this.users.updateOne(
      { _id: existingUser._id },
      { $set: { isLoggedIn: true } }
    );

    return { user: existingUser._id };
  }

  /**
   * Terminate a user's session.
   * @requires The user exists and is logged in.
   * @effects Sets the user's status to logged out.
   */
  public async logout(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    const authenticatedUser = await this.isAuthenticated({ user });
    if (!authenticatedUser) return { error: "User must be logged in" };

    await this.users.updateOne(
      { _id: authenticatedUser._id },
      { $set: { isLoggedIn: false } }
    );
    return {};
  }

  /**
   * Change a user's password. 
   * @requires The user exists and is logged in. The old password matches the user's current password.
   * @effects Updates the user's password to the new password.
   */
  public async changePassword(
    { user, oldPassword, newPassword }: { user: User, oldPassword: string, newPassword: string },
  ): Promise<Empty | { error: string }> {
    const authenticatedUser = await this.isAuthenticated({ user });
    if (!authenticatedUser) return { error: "User must be logged in" };
    
    if (!this.verifyPassword(oldPassword, authenticatedUser.hashedPassword)) return { error: "Incorrect previous password" };

    await this.users.updateOne(
      { _id: authenticatedUser._id },
      { $set: { hashedPassword: this.hashPassword(newPassword) } }
    );
    return {}
  }

  /**
   * Delete a user.
   * @requires The user exists and is logged in. The provided password matches the user's current password.
   * @effects Deletes the users account.
   */
  public async deleteAccount(
    { user, password }: { user: User, password: string },
  ): Promise<Empty | { error: string }> {
    const authenticatedUser = await this.isAuthenticated({ user });
    if (!authenticatedUser) return { error: "User must be logged in" };

    if (!this.verifyPassword(password, authenticatedUser.hashedPassword)) return { error: "Incorrect password" };

    await this.users.deleteOne({ _id: authenticatedUser._id });
    return {};
  }

  /**
   * Check if a user is logged in.
   * @effects Returns the user if they are logged in or null if they are not.
   */
  private async isAuthenticated(
    { user }: { user: User }
  ): Promise<UserDoc | null> {
    const authenticatedUser = await this.users.findOne({ _id: user });
    if (!authenticatedUser || !authenticatedUser.isLoggedIn) return null;

    return authenticatedUser;
  }

  private hashPassword(password: string): string {
    return `hashed:${password}_salt123`;
  }

  private verifyPassword(plainPassword: string, hashedPassword: string): boolean {
    return (this.hashPassword(plainPassword)) === hashedPassword;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}