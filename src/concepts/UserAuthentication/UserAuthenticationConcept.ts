import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import bcrypt from "npm:bcryptjs";
import jwt from "npm:jsonwebtoken";

const JWT_SECRET = Deno.env.get("JWT_SECRET");
if (!JWT_SECRET) {
  throw new Error("GEMINI_API_KEY is not set in the environment");
}

const ACCESS_TOKEN_EXPIRES_IN = "15m"; 
const REFRESH_TOKEN_EXPIRES_IN = "7d"; 

// Collection prefix to ensure namespace separation
const PREFIX = "UserAuthentication" + ".";

// Define the types for our entires based on the concept state
type User = ID;

/**
 * a set of Users with
 *   a username String
 *   a passwordHash String
 *   a email String
 *   a createdAt Date
 */
interface UserDoc {
  _id: User;
  username: string;
  hashedPassword: string;
  email: string;
  createdAt: Date;
  refreshToken?: string;
}

/**
 * @concept UserAuthentication
 * @purpose To authenticate users so that each person’s data is securely associated with their identity and protected from unauthorized access.
 */
export default class UserAuthenticationConcept {
  users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");

    this.users.createIndex({ username: 1 }, { unique: true }).catch(err =>
      console.error("Failed to create username index:", err)
    );

    this.users.createIndex({ email: 1 }, { unique: true }). catch(err =>
      console.error("Failed to create email index:", err)
    );
  }

  /**
   * Register a new user.
   * @requires The email and username are not already in use. The email is in a valid email form.
   * @effects Creates a new user with the provided username and password and returns the user's session tokens. 
   */
  public async register(
    { username, password, email }: { username: string; password: string; email: string  },
  ): Promise<{ accessToken: string, refreshToken: string } | { error: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await this.users.findOne({ $or: [{ username }, { email: normalizedEmail }] });
    if (existingUser) return { error: "Username or email already in use" };

    if (!this.isValidEmail(normalizedEmail)) return { error: "Invalid email format" };

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserId = freshID();
    
    const newUser: UserDoc = {
      _id: newUserId,
      username,
      hashedPassword,
      email,
      createdAt: new Date(),
    }

    await this.users.insertOne(newUser);

    const accessToken = this.generateToken(newUserId, ACCESS_TOKEN_EXPIRES_IN);
    const refreshToken = this.generateToken(newUserId, REFRESH_TOKEN_EXPIRES_IN);

    await this.users.updateOne({ _id: newUserId }, { $set: { refreshToken } });

    return { accessToken, refreshToken };
  }

  /**
   * Log in a user.
   * @requires The user with matching username and password exists.
   * @effects Returns the user's session tokens.
   */
  public async login(
    { username, password }: { username: string; password: string; }, 
  ): Promise<{ accessToken: string, refreshToken: string } | { error: string }> {
    const user = await this.users.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
      return { error:"Invalid username or password" };
    }

    const accessToken = this.generateToken(user._id, ACCESS_TOKEN_EXPIRES_IN);
    const refreshToken = this.generateToken(user._id, REFRESH_TOKEN_EXPIRES_IN);

    await this.users.updateOne({ _id: user._id }, { $set: { refreshToken } });

    return { accessToken, refreshToken };
  }

  /**
   * Log out a user.
   * @requires The refresh token is valid.
   * @effects Invalidates the users refresh token.
   */
  public async logout(
    refreshToken: string
  ): Promise<Empty | { error: string }> {
    const userId = this.verifyToken(refreshToken);
    if (!userId) return { error: "Invalid or expired refresh token" };

    const user = await this.users.findOne({ _id: userId });
    if (!user || user.refreshToken !== refreshToken) {
      return { error: "Invalid refresh token" };
    }

    await this.users.updateOne(
      { _id: userId },
      { $unset: { refreshToken: "" } }
    );

    return {};
  }

  /**
   * Change a user's password. 
   * @requires The access token is valid. The old password matches the user's current password.
   * @effects Updates the user's password to the new password.
   */
  public async changePassword(
    { accessToken, oldPassword, newPassword }: { accessToken: string, oldPassword: string, newPassword: string },
  ): Promise<Empty | { error: string }> {
    const userId = this.verifyToken(accessToken);
    if (!userId) return { error: "Invalid or expired token" };
    
    const user = await this.users.findOne({ _id: userId });
    if (!user || !(await bcrypt.compare(oldPassword, user.hashedPassword))) {
      return { error: "Incorrect current password" };
    }

    const newHashed = await bcrypt.hash(newPassword, 10);
    await this.users.updateOne({ _id: user._id }, { $set: { hashedPassword: newHashed } });

    return {}
  }

  /**
   * Delete a user's account.
   * @requires The access token is valid. The provided password matches the user's current password.
   * @effects Deletes the user's account.
   */
  public async deleteAccount(
    { accessToken, password }: { accessToken: string, password: string },
  ): Promise<Empty | { error: string }> {
    const userId = this.verifyToken(accessToken);
    if (!userId) return { error: "Invalid or expired token" };

    const user = await this.users.findOne({ _id: userId });
    if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
      return { error: "Incorrect password" };
    }

    await this.users.deleteOne({ _id: user._id });
    return {};
  }

  /**
   * Refresh a user's access token.
   * @requires The refresh token is valid.
   * @effects Generates a new access token for the user.
   */
  public async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string } | { error: string }> {
    const userId = this.verifyToken(refreshToken);
    if (!userId) return { error: "Invalid or expired refresh token" };

    const user = await this.users.findOne({ _id: userId });
    if (!user || user.refreshToken !== refreshToken) {
      return { error: "Invalid refresh token" };
    }

    const newAccessToken = this.generateToken(userId, ACCESS_TOKEN_EXPIRES_IN);
    return { accessToken: newAccessToken };
  }

  /**
   * Feteches the users info.
   * @requires The access token is valid.
   * @effects Returns the users username, id, and email.
   */
  public async _getUserInfo(
    accessToken: string
  ): Promise<{ user: { id: User; username: string; email: string } } | { error: string }> {
    const userId = this.verifyToken(accessToken);
    if (!userId) return { error: "Invalid or expired token" };

    const user = await this.users.findOne({ _id: userId });
    if (!user) return { error: "User not found" };

    return {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    };
  }

  /**
   * Generate JWT token
   */
  private generateToken(userId: User, expiresIn: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn });
  }

  /**
   * Verify JWT token
   */
  private verifyToken(token: string): User | null {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: User };
      return payload.userId;
    } catch {
      return null;
    }
  }

  /**
   * Validate email format.
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}