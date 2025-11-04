/**
 * EmotionLogger synchronizations.
 * Handles emotion logging operations with user authentication via access tokens.
 */

import { EmotionLogger, UserAuthentication, Requesting } from "@concepts";
import { actions, Sync } from "@engine";

// ============================================================================
// LOG BEFORE
// ============================================================================

export const LogBeforeRequest: Sync = ({ request, accessToken, task, emotion }) => ({
  when: actions([
    Requesting.request,
    { path: "/EmotionLogger/logBefore", accessToken, task, emotion },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const LogBeforeWithUser: Sync = ({ request, user, userId, task, emotion }) => ({
  when: actions(
    [Requesting.request, { path: "/EmotionLogger/logBefore", task, emotion }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      return { ...frame, [userId]: userObj.id };
    });
  },
  then: actions([EmotionLogger.logBefore, { user: userId, task, emotion }]),
});

export const LogBeforeResponse: Sync = ({ request, log }) => ({
  when: actions(
    [Requesting.request, { path: "/EmotionLogger/logBefore" }, { request }],
    [EmotionLogger.logBefore, {}, { log }],
  ),
  then: actions([Requesting.respond, { request, log }]),
});

export const LogBeforeResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/EmotionLogger/logBefore" }, { request }],
    [EmotionLogger.logBefore, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// LOG AFTER
// ============================================================================

export const LogAfterRequest: Sync = ({ request, accessToken, task, emotion }) => ({
  when: actions([
    Requesting.request,
    { path: "/EmotionLogger/logAfter", accessToken, task, emotion },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const LogAfterWithUser: Sync = ({ request, user, userId, task, emotion }) => ({
  when: actions(
    [Requesting.request, { path: "/EmotionLogger/logAfter", task, emotion }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      return { ...frame, [userId]: userObj.id };
    });
  },
  then: actions([EmotionLogger.logAfter, { user: userId, task, emotion }]),
});

export const LogAfterResponse: Sync = ({ request, log }) => ({
  when: actions(
    [Requesting.request, { path: "/EmotionLogger/logAfter" }, { request }],
    [EmotionLogger.logAfter, {}, { log }],
  ),
  then: actions([Requesting.respond, { request, log }]),
});

export const LogAfterResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/EmotionLogger/logAfter" }, { request }],
    [EmotionLogger.logAfter, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// DELETE TASK LOGS
// ============================================================================

export const DeleteTaskLogsRequest: Sync = ({ request, accessToken, task }) => ({
  when: actions([
    Requesting.request,
    { path: "/EmotionLogger/deleteTaskLogs", accessToken, task },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const DeleteTaskLogsWithUser: Sync = ({ request, user, userId, task }) => ({
  when: actions(
    [Requesting.request, { path: "/EmotionLogger/deleteTaskLogs", task }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      return { ...frame, [userId]: userObj.id };
    });
  },
  then: actions([EmotionLogger.deleteTaskLogs, { user: userId, task }]),
});

export const DeleteTaskLogsResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/EmotionLogger/deleteTaskLogs" }, { request }],
    [EmotionLogger.deleteTaskLogs, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

// ============================================================================
// DELETE USER LOGS
// ============================================================================

export const DeleteUserLogsRequest: Sync = ({ request, accessToken }) => ({
  when: actions([
    Requesting.request,
    { path: "/EmotionLogger/deleteUserLogs", accessToken },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const DeleteUserLogsWithUser: Sync = ({ request, user, userId }) => ({
  when: actions(
    [Requesting.request, { path: "/EmotionLogger/deleteUserLogs" }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      return { ...frame, [userId]: userObj.id };
    });
  },
  then: actions([EmotionLogger.deleteUserLogs, { user: userId }]),
});

export const DeleteUserLogsResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/EmotionLogger/deleteUserLogs" }, { request }],
    [EmotionLogger.deleteUserLogs, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

// ============================================================================
// ANALYZE RECENT EMOTIONS
// ============================================================================

export const AnalyzeRecentEmotionsRequest: Sync = ({ request, accessToken }) => ({
  when: actions([
    Requesting.request,
    { path: "/EmotionLogger/analyzeRecentEmotions", accessToken },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const AnalyzeRecentEmotionsWithUser: Sync = ({ request, user, userId }) => ({
  when: actions(
    [Requesting.request, { path: "/EmotionLogger/analyzeRecentEmotions" }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      return { ...frame, [userId]: userObj.id };
    });
  },
  then: actions([EmotionLogger.analyzeRecentEmotions, { user: userId }]),
});

export const AnalyzeRecentEmotionsResponse: Sync = ({ request, analysis }) => ({
  when: actions(
    [Requesting.request, { path: "/EmotionLogger/analyzeRecentEmotions" }, { request }],
    [EmotionLogger.analyzeRecentEmotions, {}, { analysis }],
  ),
  then: actions([Requesting.respond, { request, analysis }]),
});

export const AnalyzeRecentEmotionsResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/EmotionLogger/analyzeRecentEmotions" }, { request }],
    [EmotionLogger.analyzeRecentEmotions, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// GET EMOTIONS FOR TASK
// ============================================================================

export const GetEmotionsForTaskRequest: Sync = ({ request, accessToken, task }) => ({
  when: actions([
    Requesting.request,
    { path: "/EmotionLogger/getEmotionsForTask", accessToken, task },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const GetEmotionsForTaskWithUser: Sync = ({ request, user, userId, task }) => ({
  when: actions(
    [Requesting.request, { path: "/EmotionLogger/getEmotionsForTask", task }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      return { ...frame, [userId]: userObj.id };
    });
  },
  then: actions([EmotionLogger.getEmotionsForTask, { user: userId, task }]),
});

export const GetEmotionsForTaskResponse: Sync = ({ request, task, emotions }) => ({
  when: actions(
    [Requesting.request, { path: "/EmotionLogger/getEmotionsForTask" }, { request }],
    [EmotionLogger.getEmotionsForTask, {}, { task, emotions }],
  ),
  then: actions([Requesting.respond, { request, task, emotions }]),
});

// ============================================================================
// GET EMOTION LOGS
// ============================================================================

export const GetEmotionLogsRequest: Sync = ({ request, accessToken, page, limit, phase, emotion, sortBy, sortOrder }) => ({
  when: actions([
    Requesting.request,
    { path: "/EmotionLogger/getEmotionLogs", accessToken, page, limit, phase, emotion, sortBy, sortOrder },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const GetEmotionLogsWithUser: Sync = ({ request, user, userId, page, limit, phase, emotion, sortBy, sortOrder }) => ({
  when: actions(
    [Requesting.request, { path: "/EmotionLogger/getEmotionLogs", page, limit, phase, emotion, sortBy, sortOrder }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      return { ...frame, [userId]: userObj.id };
    });
  },
  then: actions([EmotionLogger.getEmotionLogs, { user: userId, page, limit, phase, emotion, sortBy, sortOrder }]),
});

export const GetEmotionLogsResponse: Sync = ({ request, logs, total, page, totalPages }) => ({
  when: actions(
    [Requesting.request, { path: "/EmotionLogger/getEmotionLogs" }, { request }],
    [EmotionLogger.getEmotionLogs, {}, { logs, total, page, totalPages }],
  ),
  then: actions([Requesting.respond, { request, logs, total, page, totalPages }]),
});

export const GetEmotionLogsResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/EmotionLogger/getEmotionLogs" }, { request }],
    [EmotionLogger.getEmotionLogs, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// GET EMOTION STATS
// ============================================================================

export const GetEmotionStatsRequest: Sync = ({ request, accessToken }) => ({
  when: actions([
    Requesting.request,
    { path: "/EmotionLogger/getEmotionStats", accessToken },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const GetEmotionStatsWithUser: Sync = ({ request, user, userId }) => ({
  when: actions(
    [Requesting.request, { path: "/EmotionLogger/getEmotionStats" }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  where: (frames) => {
    return frames.map((frame) => {
      const userObj = frame[user] as { id: string } | undefined;
      if (!userObj) return frame;
      return { ...frame, [userId]: userObj.id };
    });
  },
  then: actions([EmotionLogger.getEmotionStats, { user: userId }]),
});

export const GetEmotionStatsResponse: Sync = ({ request, totalLogs, mostCommonEmotion, leastCommonEmotion, averageEmotionsPerDay, recentTrend }) => ({
  when: actions(
    [Requesting.request, { path: "/EmotionLogger/getEmotionStats" }, { request }],
    [EmotionLogger.getEmotionStats, {}, { totalLogs, mostCommonEmotion, leastCommonEmotion, averageEmotionsPerDay, recentTrend }],
  ),
  then: actions([Requesting.respond, { request, totalLogs, mostCommonEmotion, leastCommonEmotion, averageEmotionsPerDay, recentTrend }]),
});

export const GetEmotionStatsResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/EmotionLogger/getEmotionStats" }, { request }],
    [EmotionLogger.getEmotionStats, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

