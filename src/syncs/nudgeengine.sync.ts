/**
 * NudgeEngine synchronizations.
 * Handles nudge retrieval and cancellation with user authentication via access tokens.
 * 
 * Note: 
 * - scheduleNudge is BACKEND-ONLY and called automatically via syncs (e.g., AutoScheduleNudgeOnTaskCreate)
 * - nudgeUser is BACKEND-ONLY and triggered automatically by the background scheduler
 */

import { NudgeEngine, UserAuthentication, Requesting } from "@concepts";
import { actions, Sync } from "@engine";

// ============================================================================
// SCHEDULE NUDGE
// ============================================================================
// NOTE: scheduleNudge is BACKEND-ONLY and called automatically via syncs
// (e.g., AutoScheduleNudgeOnTaskCreate). It should NOT be exposed to frontend.
// ============================================================================

// ============================================================================
// CANCEL NUDGE
// ============================================================================

export const CancelNudgeRequest: Sync = ({ request, accessToken, task }) => ({
  when: actions([
    Requesting.request,
    { path: "/NudgeEngine/cancelNudge", accessToken, task },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const CancelNudgeWithUser: Sync = ({ request, user, userId, task }) => ({
  when: actions(
    [Requesting.request, { path: "/NudgeEngine/cancelNudge", task }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      return { ...frame, [userId]: userObj.id };
    });
  },
  then: actions([NudgeEngine.cancelNudge, { user: userId, task }]),
});

export const CancelNudgeResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/NudgeEngine/cancelNudge" }, { request }],
    [NudgeEngine.cancelNudge, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const CancelNudgeResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/NudgeEngine/cancelNudge" }, { request }],
    [NudgeEngine.cancelNudge, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// DELETE USER NUDGES
// ============================================================================

export const DeleteUserNudgesRequest: Sync = ({ request, accessToken }) => ({
  when: actions([
    Requesting.request,
    { path: "/NudgeEngine/deleteUserNudges", accessToken },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const DeleteUserNudgesWithUser: Sync = ({ request, user, userId }) => ({
  when: actions(
    [Requesting.request, { path: "/NudgeEngine/deleteUserNudges" }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      return { ...frame, [userId]: userObj.id };
    });
  },
  then: actions([NudgeEngine.deleteUserNudges, { user: userId }]),
});

export const DeleteUserNudgesResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/NudgeEngine/deleteUserNudges" }, { request }],
    [NudgeEngine.deleteUserNudges, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

// ============================================================================
// GET NUDGE
// ============================================================================

export const GetNudgeRequest: Sync = ({ request, accessToken, task }) => ({
  when: actions([
    Requesting.request,
    { path: "/NudgeEngine/getNudge", accessToken, task },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const GetNudgeWithUser: Sync = ({ request, user, userId, task }) => ({
  when: actions(
    [Requesting.request, { path: "/NudgeEngine/getNudge", task }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      return { ...frame, [userId]: userObj.id };
    });
  },
  then: actions([NudgeEngine.getNudge, { user: userId, task }]),
});

export const GetNudgeResponse: Sync = ({ request, nudge }) => ({
  when: actions(
    [Requesting.request, { path: "/NudgeEngine/getNudge" }, { request }],
    [NudgeEngine.getNudge, {}, { nudge }],
  ),
  then: actions([Requesting.respond, { request, nudge }]),
});

export const GetNudgeResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/NudgeEngine/getNudge" }, { request }],
    [NudgeEngine.getNudge, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// GET USER NUDGES
// ============================================================================

export const GetUserNudgesRequest: Sync = ({ request, accessToken, status, limit }) => ({
  when: actions([
    Requesting.request,
    { path: "/NudgeEngine/getUserNudges", accessToken, status, limit },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const GetUserNudgesWithUser: Sync = ({ request, user, userId, status, limit }) => ({
  when: actions(
    [Requesting.request, { path: "/NudgeEngine/getUserNudges", status, limit }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      const newFrame = { ...frame, [userId]: userObj.id };
      // Convert null to default values for optional parameters
      if (limit in newFrame && newFrame[limit] === null) newFrame[limit] = 50;
      // For status, null means "no filter" - keep as null (will be handled by concept method)
      return newFrame;
    });
  },
  then: actions([NudgeEngine.getUserNudges, { user: userId, status, limit }]),
});

export const GetUserNudgesResponse: Sync = ({ request, nudges }) => ({
  when: actions(
    [Requesting.request, { path: "/NudgeEngine/getUserNudges" }, { request }],
    [NudgeEngine.getUserNudges, {}, { nudges }],
  ),
  then: actions([Requesting.respond, { request, nudges }]),
});

// ============================================================================
// GET READY NUDGES
// ============================================================================

export const GetReadyNudgesRequest: Sync = ({ request, accessToken }) => ({
  when: actions([
    Requesting.request,
    { path: "/NudgeEngine/getReadyNudges", accessToken },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const GetReadyNudgesWithUser: Sync = ({ request, user, userId }) => ({
  when: actions(
    [Requesting.request, { path: "/NudgeEngine/getReadyNudges" }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      return { ...frame, [userId]: userObj.id };
    });
  },
  then: actions([NudgeEngine.getReadyNudges, { user: userId }]),
});

export const GetReadyNudgesResponse: Sync = ({ request, nudges }) => ({
  when: actions(
    [Requesting.request, { path: "/NudgeEngine/getReadyNudges" }, { request }],
    [NudgeEngine.getReadyNudges, {}, { nudges }],
  ),
  then: actions([Requesting.respond, { request, nudges }]),
});

