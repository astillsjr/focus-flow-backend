import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";

Deno.test("UserAuthentication Concept - Operational Principle & Scenarios", async (t) => {
  const [db, client] = await testDb();
  const auth = new UserAuthenticationConcept(db);

  await t.step("Principle: User registers, changes password, logs out, relogs in, and deletes their account", async () => {
    // 1. Register a new user
    const registration = await auth.register({
      username: "alice",
      password: "securePass1!",
      email: "alice@example.com",
    });
    assertNotEquals(
      "error" in registration,
      true,
      "User registration should not fail.",
    );
    const { accessToken, refreshToken } = registration as { accessToken: string, refreshToken: string };

    // 2. Change password
    const change = await auth.changePassword({
      accessToken,
      oldPassword: "securePass1!",
      newPassword: "newSecure123",
    });
    assertNotEquals(
      "error" in change,
      true,
      "Password change should not fail.",
    );

    // 3. Log Out
    const logout = await auth.logout({ refreshToken });
    assertNotEquals(
      "error" in logout,
      true,
      "Logout should not fail.",
    );

    // 4. Log in with new password
    const relog = await auth.login({
      username: "alice",
      password: "newSecure123",
    });
    assertNotEquals(
      "error" in relog,
      true,
      "Logging in with new password should succeed.",
    );
    const { accessToken: accessToken2 } = relog as { accessToken: string };
    
    // 4. Delete account
    const deletion = await auth.deleteAccount({
      accessToken: accessToken2,
      password: "newSecure123",
    });
    assertNotEquals(
      "error" in deletion,
      true,
      "Account deletion should succeed.",
    );

    const userInDb = await auth.users.findOne({ username: "alice" });
    assertEquals(userInDb, null, "User should be deleted from database.");
  });

  await t.step("Action: register requires unique email and username", async () => {
    await auth.register({
      username: "bob",
      password: "test123",
      email: "bob@example.com",
    });

    const dupUsername = await auth.register({
      username: "bob",
      password: "another",
      email: "bob2@example.com",
    });

    const dupEmail = await auth.register({
      username: "bob2",
      password: "another",
      email: "bob@example.com",
    });

    assertEquals(
      "error" in dupUsername, 
      true, 
      "Should fail when registering with a duplicate username."
    );
    assertEquals(
      "error" in dupEmail, 
      true,
      "Should fail when registering with a duplicate email."
    );
  });

  await t.step("Action: register requires valid email format", async () => {
    const badEmail = await auth.register({
      username: "charlie",
      password: "test",
      email: "not-an-email",
    });

    assertEquals(
      "error" in badEmail, 
      true,
      "Should fail when registering with invalid email format."
    );
    assertEquals((badEmail as { error: string }).error, "Invalid email format");
  });

  await t.step("Action: login requires valid login credentials", async () => {
    const loginFail = await auth.login({
      username: "unknownUser",
      password: "wrongpass",
    });

    assertEquals(
      "error" in loginFail,
      true,
      "Should fail when logging in with invalid credentials."
    );
    assertEquals((loginFail as { error: string }).error, "Invalid username or password");
  });

  await t.step("Action: logout clears refresh token", async () => {
    const { refreshToken } = await auth.register({
      username: "logan",
      password: "logout123!",
      email: "logan@example.com",
    }) as { refreshToken: string };

    const logout = await auth.logout({ refreshToken });
    assertEquals(
      "error" in logout, 
      false,
      "Logout should succeed."
    );

    const refreshAttempt = await auth.refreshAccessToken({ refreshToken });
    assertEquals(
      "error" in refreshAttempt, 
      true, 
      "Should fail after logout"
    );
  });

  await t.step("Action: password change requires authentication and a correct old password", async () => {
    const { accessToken } = await auth.register({
      username: "diana",
      password: "mypassword",
      email: "diana@example.com",
    }) as { accessToken: string };

    // Wrong old password
    const wrongPassChange = await auth.changePassword({
      accessToken,
      oldPassword: "wrong",
      newPassword: "newpass",
    });

    assertEquals(
      "error" in wrongPassChange, 
      true,
      "Should fail when providing the wrong old password during password change."
    );
    assertEquals((wrongPassChange as { error: string }).error, "Incorrect current password");

    // Expired/invalid token
    const badTokenChange = await auth.changePassword({
      accessToken: "invalid.jwt.token",
      oldPassword: "mypassword",
      newPassword: "newpass",
    });

    assertEquals(
      "error" in badTokenChange, 
      true,
      "Should fail when attempting password change while not logged in."
    );
  });

  await t.step("Query: user info requires authentication", async () => {
    const registration = await auth.register({
      username: "eve",
      password: "securePass1!",
      email: "eve@example.com",
    });
    assertNotEquals(
      "error" in registration,
      true,
      "User registration should not fail.",
    );
    const { accessToken } = registration as { accessToken: string, refreshToken: string };

    const info = await auth.getUserInfo({ accessToken });
    if (!("user" in info)) throw new Error(`getUserInfo failed: ${info.error}`);
    assertEquals(info.user.username, "eve");
    assertEquals(info.user.email, "eve@example.com");
    assertExists(info.user.id, "User ID should be present");

    const result = await auth.getUserInfo({ accessToken: "bad.token.value" });
    assertEquals(
      "error" in result, 
      true,
      "Should fail when querying without authentication."
    );
  });

  await t.step("Action: refreshAccessToken requires valid refresh token", async () => {
    const { refreshToken } = await auth.register({
      username: "frank",
      password: "refresh123!",
      email: "frank@example.com",
    }) as { accessToken: string, refreshToken: string };

    const refresh = await auth.refreshAccessToken({ refreshToken });
    assertNotEquals(
      "error" in refresh,
      true,
      "Token refresh should succeed with valid refresh token."
    );
    assertExists((refresh as { accessToken: string }).accessToken, "New access token should be returned");

    const invalidRefresh = await auth.refreshAccessToken({ refreshToken: "invalid.token" });
    assertEquals(
      "error" in invalidRefresh,
      true,
      "Should fail with invalid refresh token."
    );
  });

  await t.step("Query: hasActiveSession checks for active session", async () => {
    const registration = await auth.register({
      username: "grace",
      password: "session123!",
      email: "grace@example.com",
    });
    const { accessToken } = registration as { accessToken: string, refreshToken: string };
    const userInfo = await auth.getUserInfo({ accessToken });
    if (!("user" in userInfo)) throw new Error(`getUserInfo failed: ${userInfo.error}`);
    const userId = userInfo.user.id;

    const hasSession = await auth.hasActiveSession({ user: userId });
    assertEquals(hasSession, true, "User should have active session after registration.");

    const { refreshToken } = registration as { accessToken: string, refreshToken: string };
    await auth.logout({ refreshToken });

    const noSession = await auth.hasActiveSession({ user: userId });
    assertEquals(noSession, false, "User should not have active session after logout.");
  });

  await t.step("Query: timestamp methods track SSE event delivery", async () => {
    const registration = await auth.register({
      username: "henry",
      password: "timestamp123!",
      email: "henry@example.com",
    });
    const { accessToken } = registration as { accessToken: string, refreshToken: string };
    const userInfo = await auth.getUserInfo({ accessToken });
    if (!("user" in userInfo)) throw new Error(`getUserInfo failed: ${userInfo.error}`);
    const userId = userInfo.user.id;

    // Initially, timestamps should be null
    const initialNudgeTs = await auth.getLastSeenNudgeTimestamp({ user: userId });
    assertEquals(initialNudgeTs, null, "Initial nudge timestamp should be null");

    const initialBetTs = await auth.getLastSeenBetTimestamp({ user: userId });
    assertEquals(initialBetTs, null, "Initial bet timestamp should be null");

    // Update nudge timestamp
    const nudgeTimestamp = new Date(Date.now() - 60000);
    await auth.updateLastSeenNudgeTimestamp({ user: userId, timestamp: nudgeTimestamp });
    const updatedNudgeTs = await auth.getLastSeenNudgeTimestamp({ user: userId });
    assertExists(updatedNudgeTs, "Updated nudge timestamp should exist");
    assertEquals(updatedNudgeTs?.getTime(), nudgeTimestamp.getTime(), "Nudge timestamp should match");

    // Update bet timestamp (without specifying, should use current time)
    const beforeUpdate = Date.now();
    await auth.updateLastSeenBetTimestamp({ user: userId });
    const afterUpdate = Date.now();
    const updatedBetTs = await auth.getLastSeenBetTimestamp({ user: userId });
    assertExists(updatedBetTs, "Updated bet timestamp should exist");
    assertExists(updatedBetTs?.getTime(), "Bet timestamp should be set");
    // Timestamp should be between before and after (allowing some margin)
    if (updatedBetTs) {
      assertEquals(
        updatedBetTs.getTime() >= beforeUpdate && updatedBetTs.getTime() <= afterUpdate,
        true,
        "Bet timestamp should be set to current time when not specified"
      );
    }

    // Update with specific timestamp
    const betTimestamp = new Date(Date.now() - 30000);
    await auth.updateLastSeenBetTimestamp({ user: userId, timestamp: betTimestamp });
    const specificBetTs = await auth.getLastSeenBetTimestamp({ user: userId });
    assertEquals(specificBetTs?.getTime(), betTimestamp.getTime(), "Bet timestamp should match provided value");
  });

  // Clean up test DB
  await client.close();
});