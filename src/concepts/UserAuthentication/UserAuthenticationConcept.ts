import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import bcrypt from "npm:bcryptjs";
import jwt from "npm:jsonwebtoken";

const JWT_SECRET = Deno.env.get("JWT_SECRET");
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in the environment");
}

const ACCESS_TOKEN_EXPIRES_IN = "15m"; 
const REFRESH_TOKEN_EXPIRES_IN = "7d"; 

// Collection prefix to avoid name clashes
const PREFIX = "UserAuthentication" + ".";

// Define the types for our entries based on the concept state
type User = ID;

/**
 * a set of Users with
 *   a username String
 *   a hashedPassword String
 *   a email String
 *   a createdAt Date
 *   a refreshToken String (optional, present while logged in)
 *   a lastSeenNudgeTimestamp Date (optional, tracks when last nudge was sent)
 *   a lastSeenBetTimestamp Date (optional, tracks when last bet event was sent)
 */
interface UserDoc {
  _id: User;
  username: string;
  hashedPassword: string;
  email: string;
  createdAt: Date;
  refreshToken?: string;
  lastSeenNudgeTimestamp?: Date;
  lastSeenBetTimestamp?: Date;
}

/**
 * @concept UserAuthentication
 * @purpose To authenticate users so that each person’s data is securely associated with their identity and protected from unauthorized access.
 */
export default class UserAuthenticationConcept {
  users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");

    this.users.createIndex({ username: 1 }, { unique: true }).catch((err) => {
      console.error("Failed to create username index:", err);
    });

    this.users.createIndex({ email: 1 }, { unique: true }).catch((err) => {
      console.error("Failed to create email index:", err);
    });
  }

  /**
   * Register a new user.
   * @requires The provided email and username must not already exist. 
   *           The email must be in valid format.
   * @effects Creates a new user record with a hashed password and returns a new pair of session tokens. 
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
    };

    await this.users.insertOne(newUser);

    const accessToken = this.generateToken(newUserId, ACCESS_TOKEN_EXPIRES_IN);
    const refreshToken = this.generateToken(newUserId, REFRESH_TOKEN_EXPIRES_IN);

    await this.users.updateOne({ _id: newUserId }, { $set: { refreshToken } });

    return { accessToken, refreshToken };
  }

  /**
   * Logs in an existing user.
   * @requires The provided username and password must match an existing user account.
   * @effects Returns a new pair of access and refresh tokens for the authenticated user.
   */
  public async login(
    { username, password }: { username: string; password: string; }, 
  ): Promise<{ accessToken: string, refreshToken: string } | { error: string }> {
    const user = await this.users.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
      return { error: "Invalid username or password" };
    }

    const accessToken = this.generateToken(user._id, ACCESS_TOKEN_EXPIRES_IN);
    const refreshToken = this.generateToken(user._id, REFRESH_TOKEN_EXPIRES_IN);

    await this.users.updateOne({ _id: user._id }, { $set: { refreshToken } });

    return { accessToken, refreshToken };
  }

  /**
   * Logs out a user.
   * @requires A valid refresh token must be provided.
   * @effects Invalidates the user's current refresh token, ending their session.
   */
  public async logout(
    { refreshToken }: { refreshToken: string }
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
   * Refreshes a user's access token.
   * @requires A valid and active refresh token must be provided.
   * @effects Generates and returns a new short-lived access token.
   */
  public async refreshAccessToken(
    { refreshToken }: { refreshToken: string }
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
   * Changes a user's password.
   * @requires A valid access token must be provided.
   *           The old password must match the user's current password.
   * @effects Updates the user's stored password hash to the new password.
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

    return {};
  }

  /**
   * Deletes a user's account.
   * @requires A valid access token must be provided. 
   *           The provided password must match the user's current password.
   * @effects Permanently removes the user's account.
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
   * Fetches the authenticated user's information.
   * @requires A valid access token must be provided.
   * @effects Returns the user's ID, username, and email address.
   */
  public async getUserInfo(
    { accessToken }:  { accessToken: string }
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
   * Checks if a user has an active session (has a refresh token).
   * @effects Returns true if the user has an active session, false otherwise.
   */
  public async hasActiveSession(
    { user }: { user: User }
  ): Promise<boolean> {
    const userDoc = await this.users.findOne({ _id: user });
    return !!userDoc?.refreshToken;
  }

  /**
   * Gets the last seen nudge timestamp for a user.
   * Returns the timestamp when the last nudge was sent, or null if never sent.
   */
  public async getLastSeenNudgeTimestamp(
    { user }: { user: User }
  ): Promise<Date | null> {
    const userDoc = await this.users.findOne({ _id: user });
    return userDoc?.lastSeenNudgeTimestamp || null;
  }

  /**
   * Gets the last seen bet timestamp for a user.
   * Returns the timestamp when the last bet event was sent, or null if never sent.
   */
  public async getLastSeenBetTimestamp(
    { user }: { user: User }
  ): Promise<Date | null> {
    const userDoc = await this.users.findOne({ _id: user });
    return userDoc?.lastSeenBetTimestamp || null;
  }

  /**
   * Updates the last seen nudge timestamp for a user.
   * @effects Sets the lastSeenNudgeTimestamp to the provided timestamp (or current time if not provided).
   */
  public async updateLastSeenNudgeTimestamp(
    { user, timestamp }: { user: User; timestamp?: Date }
  ): Promise<Empty> {
    const updateTimestamp = timestamp || new Date();
    await this.users.updateOne(
      { _id: user },
      { $set: { lastSeenNudgeTimestamp: updateTimestamp } }
    );
    return {};
  }

  /**
   * Updates the last seen bet timestamp for a user.
   * @effects Sets the lastSeenBetTimestamp to the provided timestamp (or current time if not provided).
   */
  public async updateLastSeenBetTimestamp(
    { user, timestamp }: { user: User; timestamp?: Date }
  ): Promise<Empty> {
    const updateTimestamp = timestamp || new Date();
    await this.users.updateOne(
      { _id: user },
      { $set: { lastSeenBetTimestamp: updateTimestamp } }
    );
    return {};
  }

  /**
   * Generates a signed JWT for the specified user.
   */
  private generateToken(userId: User, expiresIn: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn });
  }

  /**
   * Verifies a JWT and extracts the associated user ID.
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
   * Validates an email string against a basic format pattern.
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}