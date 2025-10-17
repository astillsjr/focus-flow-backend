import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";

/**
 * UserAuthentication Concept Tests
 *
 * Covers:
 * - Operational principle (register → logout → login)
 * - Interesting scenarios (invalid email, duplicates, wrong passwords, etc.)
 */
Deno.test("UserAuthentication Concept - Operational Principle & Scenarios", async (t) => {
  const [db, client] = await testDb();
  const auth = new UserAuthenticationConcept(db);

  // ---------------------------
  // OPERATIONAL PRINCIPLE TEST
  // ---------------------------
  await t.step("Operational Principle: register → logout → login", async () => {
    console.log("\n--- Operational Principle Sequence ---");

    // 1. Register new user
    const regResult = await auth.register({
      username: "alice",
      password: "p@ssword1",
      email: "alice@example.com",
    });
    console.log("Action: register →", regResult);
    assertExists(regResult);
    assertEquals("error" in regResult, false);

    const { user } = regResult as { user: ID };
    const createdUser = await auth.users.findOne({ _id: user });
    assertExists(createdUser);
    assertEquals(createdUser.isLoggedIn, true);

    // 2. Logout user
    const logoutResult = await auth.logout({ user });
    console.log("Action: logout →", logoutResult);
    assertEquals("error" in logoutResult, false);

    const afterLogout = await auth.users.findOne({ _id: user });
    assertEquals(afterLogout?.isLoggedIn, false);

    // 3. Login user again
    const loginResult = await auth.login({
      username: "alice",
      password: "p@ssword1",
    });
    console.log("Action: login →", loginResult);
    assertExists(loginResult);
    assertEquals("error" in loginResult, false);

    const afterLogin = await auth.users.findOne({ _id: user });
    assertEquals(afterLogin?.isLoggedIn, true);
  });

  // ---------------------------
  // INTERESTING SCENARIOS
  // ---------------------------

  await t.step("Scenario 1: Prevent duplicate usernames", async () => {
    console.log("\n--- Scenario 1: Duplicate Registration ---");
    await auth.register({
      username: "bob",
      password: "12345",
      email: "bob@example.com",
    });

    const dup = await auth.register({
      username: "bob",
      password: "different",
      email: "bob2@example.com",
    });

    console.log("Action: duplicate register →", dup);
    assertEquals("error" in dup, true);
    assertEquals((dup as { error: string }).error, "Username already taken");
  });

  await t.step("Scenario 2: Invalid email format", async () => {
    console.log("\n--- Scenario 2: Invalid Email ---");
    const badEmail = await auth.register({
      username: "charlie",
      password: "test",
      email: "not-an-email",
    });

    console.log("Action: register (invalid email) →", badEmail);
    assertEquals("error" in badEmail, true);
    assertEquals((badEmail as { error: string }).error, "Invalid email format");
  });

  await t.step("Scenario 3: Invalid login credentials", async () => {
    console.log("\n--- Scenario 3: Invalid Login ---");
    const loginFail = await auth.login({
      username: "unknownUser",
      password: "wrongpass",
    });

    console.log("Action: login (invalid creds) →", loginFail);
    assertEquals("error" in loginFail, true);
    assertEquals(
      (loginFail as { error: string }).error,
      "Invalid username or password",
    );
  });

  await t.step("Scenario 4: Change password (success + failure cases)", async () => {
    console.log("\n--- Scenario 4: Change Password ---");

    // Create a user for this test
    const result = await auth.register({
      username: "diana",
      password: "oldpass",
      email: "diana@example.com",
    });
    assertExists(result);
    const { user } = result as { user: ID };

    // Successful password change
    const change = await auth.changePassword({
      user,
      oldPassword: "oldpass",
      newPassword: "newpass",
    });
    console.log("Action: changePassword (success) →", change);
    assertEquals("error" in change, false);

    // Verify user can log in with new password
    await auth.logout({ user });
    const relog = await auth.login({
      username: "diana",
      password: "newpass",
    });
    console.log("Action: login after password change →", relog);
    assertEquals("error" in relog, false);

    // Failure: attempt change while logged out
    await auth.logout({ user });
    const failChange = await auth.changePassword({
      user,
      oldPassword: "newpass",
      newPassword: "shouldFail",
    });
    console.log("Action: changePassword (logged out) →", failChange);
    assertEquals("error" in failChange, true);
    assertEquals(
      (failChange as { error: string }).error,
      "User must be logged in",
    );
  });

  await t.step("Scenario 5: Delete account (success + verification)", async () => {
    console.log("\n--- Scenario 5: Delete Account ---");

    // Register and delete user
    const res = await auth.register({
      username: "edward",
      password: "secret",
      email: "edward@example.com",
    });
    const { user } = res as { user: ID };

    const deletion = await auth.deleteAccount({ user, password: "secret" });
    console.log("Action: deleteAccount →", deletion);
    assertEquals("error" in deletion, false);

    const deletedUser = await auth.users.findOne({ _id: user });
    assertEquals(deletedUser, null);
  });

  // Clean up DB connection
  await client.close();
});