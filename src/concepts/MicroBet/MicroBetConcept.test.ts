import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import MicroBetConcept from "./MicroBetConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("MicroBet Concept - Operational Principle & Scenarios", async (t) => {
  const [db, client] = await testDb();
  const bets = new MicroBetConcept(db);
  const user = "user:Alice" as ID;
  const task = "task:Essay" as ID;

  await t.step("Principle: User initializes, places bet, resolves bet, views stats, views their history", async () => {
    // 1. Initialize betting profile
    const init = await bets.initializeBettor({ user });
    assertNotEquals(
      "error" in init,
      true,
      "Bettor initialization should not fail.",
    );

    // Give user some points manually for testing wagers
    await bets.users.updateOne({ _id: user }, { $set: { points: 100 } });

    // 2. Place a bet
    const deadline = new Date(Date.now() + 60_000); // 1 min from now
    const place = await bets.placeBet({
      user,
      task,
      wager: 20,
      deadline,
    });
    assertNotEquals(
      "error" in place,
      true,
      "Bet placement should not fail.",
    );

    const { bet } = place as { bet: ID };
    const placedBet = await bets.bets.findOne({ _id: bet });
    assertExists(placedBet);
    assertEquals(
      placedBet.wager, 
      20,
      "Incorrect stroage of bet wager."
    );

    // Check points deducted
    const afterPlace = await bets.users.findOne({ _id: user });
    assertEquals(
      afterPlace?.points, 
      80,
      "Incorrect deduction of points from user after bet."
    );

    // 3. Resolve bet successfully (before deadline)
    const res = await bets.resolveBet({
      user,
      task,
      completionTime: new Date(Date.now() + 5000),
    });
    assertNotEquals(
      "error" in res,
      true,
      "Bet resolution should succeed.",
    );
    assertEquals((res as { status: string }).status, "success");

    const afterResolve = await bets.users.findOne({ _id: user });
    assertEquals(
      afterResolve?.streak, 
      1,
      "Incorrect streak increment after successful bet."
    );
    assertEquals(
      afterResolve?.points! > 80, 
      true,
      "Incorrect user reward after successful bet."
    );

    // 4. View stats
    const stats = await bets.getUserProfile({ user });
    assertNotEquals(
      "error" in stats,
      true,
      "Stat fetch should not fail.",
    );
    assertEquals(
      (stats as {
        points: number;
        streak: number;
        totalBets: number;
        successfulBets: number;
        failedBets: number;
        pendingBets: number;
      }).points, 
      102,
      "Incorrect user stats fetch."
    );
    assertEquals(
      (stats as {
        points: number;
        streak: number;
        totalBets: number;
        successfulBets: number;
        failedBets: number;
        pendingBets: number;
      }).streak, 
      1,
      "Incorrect user stats fetch."
    );

    // 5. View history
    const history = await bets.getRecentActivity({ user });
    assertEquals(Array.isArray(history), true);
    assertEquals((history as any[]).length >= 1, true);
  });

  await t.step("Action: time bonus rewards earlier bet deadlines", async () => {
    const user2 = "user:Bob" as ID;
    await bets.initializeBettor({ user: user2 });
    await bets.users.updateOne({ _id: user2 }, { $set: { points: 100 } });
  
    const taskWithDue = "task:TimedTask" as ID;
    const now = Date.now();
    const betDeadline = new Date(now + 24 * 60 * 60 * 1000); // 1 day from now
    const taskDueDate = new Date(now + 15 * 24 * 60 * 60 * 1000); // 15 days from now
  
    // Place bet with task due date (should get max time bonus)
    await bets.placeBet({
      user: user2,
      task: taskWithDue,
      wager: 20,
      deadline: betDeadline,
      taskDueDate: taskDueDate,
    });
  
    const pointsAfterBet = (await bets.users.findOne({ _id: user2 }))!.points;
    assertEquals(pointsAfterBet, 80, "Points should be deducted after bet.");
  
    // Resolve bet successfully
    const resolved = await bets.resolveBet({
      user: user2,
      task: taskWithDue,
      completionTime: new Date(now + 1000),
    });
  
    assertNotEquals("error" in resolved, true, "Bet resolution should succeed.");
    
    const pointsAfterResolve = (await bets.users.findOne({ _id: user2 }))!.points;
    
    // With 14-day gap, should get full time bonus (25%)
    // reward ≈ 20 * (1 + 0.15 * streakBonus + 0.25) ≈ 26
    assertEquals(
      pointsAfterResolve > 104,
      true,
      "Time bonus should increase reward for early bet deadline."
    );
  });
  
  await t.step("Action: bet deadline must be before task due date", async () => {
    const user3 = "user:Charlie" as ID;
    await bets.initializeBettor({ user: user3 });
    await bets.users.updateOne({ _id: user3 }, { $set: { points: 100 } });
  
    const now = Date.now();
    const badDeadline = new Date(now + 10 * 24 * 60 * 60 * 1000); // 10 days
    const earlierDueDate = new Date(now + 5 * 24 * 60 * 60 * 1000); // 5 days
  
    const result = await bets.placeBet({
      user: user3,
      task: "task:Invalid" as ID,
      wager: 10,
      deadline: badDeadline,
      taskDueDate: earlierDueDate,
    });
  
    assertEquals(
      "error" in result,
      true,
      "Should fail when bet deadline is after task due date."
    );
    assertEquals(
      (result as { error: string }).error,
      "Bet deadline must be before task due date",
      "Correct error message for invalid deadline."
    );
  });
  
  await t.step("Action: initializng bettors prohibits duplicate users", async () => {
    const duplicate = await bets.initializeBettor({ user });
    assertEquals(
      "error" in duplicate, 
      true,
      "Initializng a duplicate user should fail."
    );
    assertEquals(
      (duplicate as { error: string }).error,
      "User already initialized",
    );
  });

  await t.step("Action: bet placing prohibits uninitialized users", async () => {
    const missingUserResult = await bets.placeBet({
      user: "user:Ghost" as ID,
      task: "task:Fail" as ID,
      wager: 10,
      deadline: new Date(Date.now() + 10000),
    });
    assertEquals(
      "error" in missingUserResult, 
      true,
      "Placing a bet with uninitialized user should fail."
    );
    assertEquals(
      (missingUserResult as { error: string }).error,
      "User profile not found",
    );
  });

  await t.step("Action: bet placing prohibts duplicate bets and invalid deadlines", async () => {
    const task2 = "task:Duplicate" as ID;
    await bets.users.updateOne({ _id: user }, { $set: { points: 200 } });

    const first = await bets.placeBet({
      user,
      task: task2,
      wager: 10,
      deadline: new Date(Date.now() + 5000),
    });
    assertEquals(
      "error" in first, 
      false,
      "Bet placement should succeed."
    );

    const duplicate = await bets.placeBet({
      user,
      task: task2,
      wager: 10,
      deadline: new Date(Date.now() + 10_000),
    });
    assertEquals(
      "error" in duplicate, 
      true,
      "Placing a duplicate bet should fail."
    );
    assertEquals(
      (duplicate as { error: string }).error,
      "Failed to place bet",
    );

    const past = await bets.placeBet({
      user,
      task: "task:Past" as ID,
      wager: 5,
      deadline: new Date(Date.now() - 10_000),
    });
    assertEquals(
      "error" in past,
      true,
      "Placing a bet with an elasped due date should fail."
    );
    assertEquals(
      (past as { error: string }).error,
      "Deadline must be in the future",
    );
  });

  await t.step("Action: canceling a bet before its deadline refunds points", async () => {
    const task3 = "task:Cancel" as ID;
    await bets.users.updateOne({ _id: user }, { $set: { points: 50 } });

    const placed = await bets.placeBet({
      user,
      task: task3,
      wager: 10,
      deadline: new Date(Date.now() + 30_000),
    });
    assertEquals(
      "error" in placed, 
      false,
      "Bet placement should succeed."
    );

    const beforeCancel = await bets.users.findOne({ _id: user });
    const cancel = await bets.cancelBet({ user, task: task3 });
    assertEquals(
      "error" in cancel, 
      false,
      "Bet cancelation should succeed."
    );

    const afterCancel = await bets.users.findOne({ _id: user });
    assertEquals(
      afterCancel!.points, 
      beforeCancel!.points + 10,
      "Canceling a bet before its deadline should refund wager."
    );

    const deletedBet = await bets.bets.findOne({ user, task: task3 });
    assertEquals(
      deletedBet, 
      null,
      "A canceled bet should be removed from the state."
    );
  });

  await t.step("Action: resolving expired bets reset user streak", async () => {
    const task4 = "task:Expired" as ID;
    await bets.users.updateOne({ _id: user }, { $set: { streak: 3, points: 100 } });

    const newBet = await bets.placeBet({
      user,
      task: task4,
      wager: 10,
      deadline: new Date(Date.now() - 2000), // expired
    });
    assertEquals(
      "error" in newBet, 
      true,
      "Placing an expired bet should fail."
    ); 

    // Force-insert a bet to simulate past-due unresolved bet
    const forcedBetId = "forced:expired" as ID;
    await bets.bets.insertOne({
      _id: forcedBetId,
      user,
      task: task4,
      wager: 10,
      deadline: new Date(Date.now() - 10_000),
      createdAt: new Date(),
    });

    const resFail = await bets.resolveExpiredBet({ user, task: task4 });
    assertEquals(
      "error" in resFail, 
      false,
      "Expired bet resolution should succeed."
    );

    const afterFailUser = await bets.users.findOne({ _id: user });
    assertEquals(
      afterFailUser?.streak, 
      0,
      "Streak should reset after expired bet resolution."
    );
  });

  await t.step("Action: bettor removal removes all user bets", async () => {
    await bets.users.updateOne({ _id: user }, { $set: { points: 30 } });

    // Create a few bets for cleanup
    for (let i = 0; i < 3; i++) {
      await bets.placeBet({
        user,
        task: `task:Cleanup${i}` as ID,
        wager: 1,
        deadline: new Date(Date.now() + 10_000),
      });
    }

    const beforeRemove = await bets.bets.find({ user }).toArray();
    assertEquals(
      beforeRemove.length >= 1, 
      true,
      "Bettor should have a least one bet."
    );

    const removal = await bets.removeBettor({ user });
    assertEquals(
      "error" in removal, 
      false,
      "Bettor removal should succeed."
    );

    const userAfterRemove = await bets.users.findOne({ _id: user });
    const betsAfterRemove = await bets.bets.find({ user }).toArray();
    assertEquals(
      userAfterRemove, 
      null,
      "User should not be queriable after removal."
    );
    assertEquals(
      betsAfterRemove.length, 
      0,
      "User should have no bets after removal."
    );
  });

  await client.close();
});