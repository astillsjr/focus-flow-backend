/**
 * NudgeEngine synchronizations.
 * Handles nudge scheduling and retrieval with user authentication via access tokens.
 * Note: nudgeUser is backend-only and handled separately.
 */

import { NudgeEngine, UserAuthentication, Requesting } from "@concepts";
import { actions, Sync } from "@engine";

// ============================================================================
// SCHEDULE NUDGE
// ============================================================================

export const ScheduleNudgeRequest: Sync = ({ request, accessToken, task, deliveryTime }) => ({
  when: actions([
    Requesting.request,
    { path: "/NudgeEngine/scheduleNudge", accessToken, task, deliveryTime },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const ScheduleNudgeWithUser: Sync = ({ request, user, userId, task, deliveryTime }) => ({
  when: actions(
    [Requesting.request, { path: "/NudgeEngine/scheduleNudge", task, deliveryTime }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      const newFrame = { ...frame, [userId]: userObj.id };
      // Convert deliveryTime string to Date if it's a string
      if (deliveryTime in newFrame) {
        const dtValue = newFrame[deliveryTime];
        if (typeof dtValue === 'string') {
          newFrame[deliveryTime] = new Date(dtValue);
        }
      }
      return newFrame;
    });
  },
  then: actions([NudgeEngine.scheduleNudge, { user: userId, task, deliveryTime }]),
});

export const ScheduleNudgeResponse: Sync = ({ request, nudge }) => ({
  when: actions(
    [Requesting.request, { path: "/NudgeEngine/scheduleNudge" }, { request }],
    [NudgeEngine.scheduleNudge, {}, { nudge }],
  ),
  then: actions([Requesting.respond, { request, nudge }]),
});

export const ScheduleNudgeResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/NudgeEngine/scheduleNudge" }, { request }],
    [NudgeEngine.scheduleNudge, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

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

