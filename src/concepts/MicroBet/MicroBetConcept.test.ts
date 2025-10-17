import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import MicroBetConcept from "./MicroBetConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("MicroBet Concept - Operational Principle & Scenarios", async (t) => {
  const [db, client] = await testDb();
  const bets = new MicroBetConcept(db);
  const user = "user:Alice" as ID;
  const task = "task:Essay" as ID;

  // ---------------------------
  // OPERATIONAL PRINCIPLE TEST
  // ---------------------------
  await t.step("Operational Principle: initialize → placeBet → resolveBet → viewHistory", async () => {
    console.log("\n--- Operational Principle Sequence ---");

    // 1. Initialize betting profile
    const init = await bets.initializeBettor({ user });
    console.log("Action: initializeBettor →", init);
    assertEquals("error" in init, false);

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
    console.log("Action: placeBet →", place);
    assertEquals("error" in place, false);

    const { bet } = place as { bet: ID };
    const placedBet = await bets.bets.findOne({ _id: bet });
    assertExists(placedBet);
    assertEquals(placedBet.wager, 20);

    // Check points deducted
    const afterPlace = await bets.users.findOne({ _id: user });
    assertEquals(afterPlace?.points, 80);

    // 3. Resolve bet successfully (before deadline)
    const res = await bets.resolveBet({
      user,
      task,
      completionTime: new Date(Date.now() + 5000),
    });
    console.log("Action: resolveBet →", res);
    assertEquals("error" in res, false);
    assertEquals((res as { status: string }).status, "success");

    const afterResolve = await bets.users.findOne({ _id: user });
    assertEquals(afterResolve?.streak, 1);
    assertEquals(afterResolve?.points! > 80, true);

    // 4. View history
    const history = await bets.viewBetHistory({ user });
    console.log("Action: viewBetHistory →", history);
    assertEquals(Array.isArray(history), true);
    assertEquals((history as any[]).length >= 1, true);
  });

  // ---------------------------
  // INTERESTING SCENARIOS
  // ---------------------------

  await t.step("Scenario 1: Prevent duplicate bettor and missing profile usage", async () => {
    console.log("\n--- Scenario 1: Profile Validation ---");

    const duplicate = await bets.initializeBettor({ user });
    console.log("Action: initializeBettor duplicate →", duplicate);
    assertEquals("error" in duplicate, true);
    assertEquals(
      (duplicate as { error: string }).error,
      "This user is already a part of the system",
    );

    const missingUserResult = await bets.placeBet({
      user: "user:Ghost" as ID,
      task: "task:Fail" as ID,
      wager: 10,
      deadline: new Date(Date.now() + 10000),
    });
    console.log("Action: placeBet without profile →", missingUserResult);
    assertEquals("error" in missingUserResult, true);
    assertEquals(
      (missingUserResult as { error: string }).error,
      "User does not have a betting profile",
    );
  });

  await t.step("Scenario 2: Prevent duplicate bets and invalid deadlines", async () => {
    console.log("\n--- Scenario 2: Duplicate Bets & Past Deadlines ---");

    const task2 = "task:Duplicate" as ID;
    await bets.users.updateOne({ _id: user }, { $set: { points: 200 } });

    const first = await bets.placeBet({
      user,
      task: task2,
      wager: 10,
      deadline: new Date(Date.now() + 5000),
    });
    assertEquals("error" in first, false);

    const duplicate = await bets.placeBet({
      user,
      task: task2,
      wager: 10,
      deadline: new Date(Date.now() + 10_000),
    });
    console.log("Action: placeBet duplicate →", duplicate);
    assertEquals("error" in duplicate, true);
    assertEquals(
      (duplicate as { error: string }).error,
      "Bet for this task already exists",
    );

    const past = await bets.placeBet({
      user,
      task: "task:Past" as ID,
      wager: 5,
      deadline: new Date(Date.now() - 10_000),
    });
    console.log("Action: placeBet past deadline →", past);
    assertEquals("error" in past, true);
    assertEquals(
      (past as { error: string }).error,
      "Due date cannot be in the past",
    );
  });

  await t.step("Scenario 3: Cancel bet (refund logic)", async () => {
    console.log("\n--- Scenario 3: Cancel Bet ---");

    const task3 = "task:Cancel" as ID;
    await bets.users.updateOne({ _id: user }, { $set: { points: 50 } });

    const placed = await bets.placeBet({
      user,
      task: task3,
      wager: 10,
      deadline: new Date(Date.now() + 30_000),
    });
    assertEquals("error" in placed, false);

    const beforeCancel = await bets.users.findOne({ _id: user });
    const cancel = await bets.cancelBet({ user, task: task3 });
    console.log("Action: cancelBet →", cancel);
    assertEquals("error" in cancel, false);

    const afterCancel = await bets.users.findOne({ _id: user });
    assertEquals(afterCancel!.points, beforeCancel!.points + 10);

    const deletedBet = await bets.bets.findOne({ user, task: task3 });
    assertEquals(deletedBet, null);
  });

  await t.step("Scenario 4: Resolve expired bets (failure & streak reset)", async () => {
    console.log("\n--- Scenario 4: Resolve Expired Bet ---");

    const task4 = "task:Expired" as ID;
    await bets.users.updateOne({ _id: user }, { $set: { streak: 3, points: 100 } });

    const newBet = await bets.placeBet({
      user,
      task: task4,
      wager: 10,
      deadline: new Date(Date.now() - 2000), // expired
    });
    console.log("Action: placeBet expired (should fail) →", newBet);
    assertEquals("error" in newBet, true); // cannot place past-due

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
    console.log("Action: resolveExpiredBet →", resFail);
    assertEquals("error" in resFail, false);

    const afterFailUser = await bets.users.findOne({ _id: user });
    assertEquals(afterFailUser?.streak, 0);
  });

  await t.step("Scenario 5: Remove bettor and verify cleanup", async () => {
    console.log("\n--- Scenario 5: Remove Bettor ---");

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
    assertEquals(beforeRemove.length >= 1, true);

    const removal = await bets.removeBettor({ user });
    console.log("Action: removeBettor →", removal);
    assertEquals("error" in removal, false);

    const userAfterRemove = await bets.users.findOne({ _id: user });
    const betsAfterRemove = await bets.bets.find({ user }).toArray();
    assertEquals(userAfterRemove, null);
    assertEquals(betsAfterRemove.length, 0);
  });

  await client.close();
});