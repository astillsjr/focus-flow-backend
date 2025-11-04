/**
 * MicroBet synchronizations.
 * Handles betting operations with user authentication via access tokens.
 * Note: resolveBet and resolveExpiredBet are backend-only and handled separately.
 */

import { MicroBet, UserAuthentication, Requesting } from "@concepts";
import { actions, Sync } from "@engine";

// ============================================================================
// INITIALIZE BETTOR
// ============================================================================

export const InitializeBettorRequest: Sync = ({ request, accessToken }) => ({
  when: actions([
    Requesting.request,
    { path: "/MicroBet/initializeBettor", accessToken },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const InitializeBettorWithUser: Sync = ({ request, user, userId }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/initializeBettor" }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      return { ...frame, [userId]: userObj.id };
    });
  },
  then: actions([MicroBet.initializeBettor, { user: userId }]),
});

export const InitializeBettorResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/initializeBettor" }, { request }],
    [MicroBet.initializeBettor, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const InitializeBettorResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/initializeBettor" }, { request }],
    [MicroBet.initializeBettor, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// REMOVE BETTOR
// ============================================================================

export const RemoveBettorRequest: Sync = ({ request, accessToken }) => ({
  when: actions([
    Requesting.request,
    { path: "/MicroBet/removeBettor", accessToken },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const RemoveBettorWithUser: Sync = ({ request, user, userId }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/removeBettor" }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      return { ...frame, [userId]: userObj.id };
    });
  },
  then: actions([MicroBet.removeBettor, { user: userId }]),
});

export const RemoveBettorResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/removeBettor" }, { request }],
    [MicroBet.removeBettor, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

// ============================================================================
// PLACE BET
// ============================================================================

export const PlaceBetRequest: Sync = ({ request, accessToken, task, wager, deadline, taskDueDate }) => ({
  when: actions([
    Requesting.request,
    { path: "/MicroBet/placeBet", accessToken, task, wager, deadline, taskDueDate },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const PlaceBetWithUser: Sync = ({ request, user, userId, task, wager, deadline, taskDueDate }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/placeBet", task, wager, deadline, taskDueDate }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      const newFrame = { ...frame, [userId]: userObj.id };
      // Convert deadline string to Date if it's a string
      if (deadline in newFrame) {
        const deadlineValue = newFrame[deadline];
        if (typeof deadlineValue === 'string') {
          newFrame[deadline] = new Date(deadlineValue);
        }
      }
      // Convert taskDueDate string to Date if it's a string (and present)
      if (taskDueDate in newFrame && newFrame[taskDueDate] !== null && newFrame[taskDueDate] !== undefined) {
        const taskDueDateValue = newFrame[taskDueDate];
        if (typeof taskDueDateValue === 'string') {
          newFrame[taskDueDate] = new Date(taskDueDateValue);
        }
      }
      return newFrame;
    });
  },
  then: actions([MicroBet.placeBet, { user: userId, task, wager, deadline, taskDueDate }]),
});

export const PlaceBetResponse: Sync = ({ request, bet }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/placeBet" }, { request }],
    [MicroBet.placeBet, {}, { bet }],
  ),
  then: actions([Requesting.respond, { request, bet }]),
});

export const PlaceBetResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/placeBet" }, { request }],
    [MicroBet.placeBet, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// CANCEL BET
// ============================================================================

export const CancelBetRequest: Sync = ({ request, accessToken, task }) => ({
  when: actions([
    Requesting.request,
    { path: "/MicroBet/cancelBet", accessToken, task },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const CancelBetWithUser: Sync = ({ request, user, userId, task }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/cancelBet", task }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      return { ...frame, [userId]: userObj.id };
    });
  },
  then: actions([MicroBet.cancelBet, { user: userId, task }]),
});

export const CancelBetResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/cancelBet" }, { request }],
    [MicroBet.cancelBet, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const CancelBetResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/cancelBet" }, { request }],
    [MicroBet.cancelBet, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// GET BET
// ============================================================================

export const GetBetRequest: Sync = ({ request, accessToken, task }) => ({
  when: actions([
    Requesting.request,
    { path: "/MicroBet/getBet", accessToken, task },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const GetBetWithUser: Sync = ({ request, user, userId, task }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/getBet", task }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      return { ...frame, [userId]: userObj.id };
    });
  },
  then: actions([MicroBet.getBet, { user: userId, task }]),
});

export const GetBetResponse: Sync = ({ request, bet }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/getBet" }, { request }],
    [MicroBet.getBet, {}, { bet }],
  ),
  then: actions([Requesting.respond, { request, bet }]),
});

export const GetBetResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/getBet" }, { request }],
    [MicroBet.getBet, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// GET ACTIVE BETS
// ============================================================================

export const GetActiveBetsRequest: Sync = ({ request, accessToken }) => ({
  when: actions([
    Requesting.request,
    { path: "/MicroBet/getActiveBets", accessToken },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const GetActiveBetsWithUser: Sync = ({ request, user, userId }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/getActiveBets" }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      return { ...frame, [userId]: userObj.id };
    });
  },
  then: actions([MicroBet.getActiveBets, { user: userId }]),
});

export const GetActiveBetsResponse: Sync = ({ request, bets }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/getActiveBets" }, { request }],
    [MicroBet.getActiveBets, {}, { bets }],
  ),
  then: actions([Requesting.respond, { request, bets }]),
});

export const GetActiveBetsResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/getActiveBets" }, { request }],
    [MicroBet.getActiveBets, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// GET EXPIRED BETS
// ============================================================================

export const GetExpiredBetsRequest: Sync = ({ request, accessToken }) => ({
  when: actions([
    Requesting.request,
    { path: "/MicroBet/getExpiredBets", accessToken },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const GetExpiredBetsWithUser: Sync = ({ request, user, userId }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/getExpiredBets" }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      return { ...frame, [userId]: userObj.id };
    });
  },
  then: actions([MicroBet.getExpiredBets, { user: userId }]),
});

export const GetExpiredBetsResponse: Sync = ({ request, bets }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/getExpiredBets" }, { request }],
    [MicroBet.getExpiredBets, {}, { bets }],
  ),
  then: actions([Requesting.respond, { request, bets }]),
});

export const GetExpiredBetsResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/getExpiredBets" }, { request }],
    [MicroBet.getExpiredBets, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// GET USER PROFILE
// ============================================================================

export const GetUserProfileRequest: Sync = ({ request, accessToken }) => ({
  when: actions([
    Requesting.request,
    { path: "/MicroBet/getUserProfile", accessToken },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const GetUserProfileWithUser: Sync = ({ request, user, userId }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/getUserProfile" }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      return { ...frame, [userId]: userObj.id };
    });
  },
  then: actions([MicroBet.getUserProfile, { user: userId }]),
});

export const GetUserProfileResponse: Sync = ({ request, points, streak, totalBets, successfulBets, failedBets, pendingBets }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/getUserProfile" }, { request }],
    [MicroBet.getUserProfile, {}, { points, streak, totalBets, successfulBets, failedBets, pendingBets }],
  ),
  then: actions([Requesting.respond, { request, points, streak, totalBets, successfulBets, failedBets, pendingBets }]),
});

export const GetUserProfileResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/getUserProfile" }, { request }],
    [MicroBet.getUserProfile, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// GET RECENT ACTIVITY
// ============================================================================

export const GetRecentActivityRequest: Sync = ({ request, accessToken, limit }) => ({
  when: actions([
    Requesting.request,
    { path: "/MicroBet/getRecentActivity", accessToken, limit },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const GetRecentActivityWithUser: Sync = ({ request, user, userId, limit }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/getRecentActivity", limit }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      const newFrame = { ...frame, [userId]: userObj.id };
      // Convert null to default value for optional parameter
      if (limit in newFrame && newFrame[limit] === null) newFrame[limit] = 10;
      return newFrame;
    });
  },
  then: actions([MicroBet.getRecentActivity, { user: userId, limit }]),
});

export const GetRecentActivityResponse: Sync = ({ request, bets }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/getRecentActivity" }, { request }],
    [MicroBet.getRecentActivity, {}, { bets }],
  ),
  then: actions([Requesting.respond, { request, bets }]),
});

export const GetRecentActivityResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/MicroBet/getRecentActivity" }, { request }],
    [MicroBet.getRecentActivity, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

