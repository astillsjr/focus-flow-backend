/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  // Public endpoints that don't require authentication
  "/api/UserAuthentication/register": "Public registration endpoint - no authentication required",
  "/api/UserAuthentication/login": "Public login endpoint - no authentication required",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // UserAuthentication - Actions requiring authentication/authorization
  "/api/UserAuthentication/logout",
  "/api/UserAuthentication/refreshAccessToken",
  "/api/UserAuthentication/getUserInfo",
  "/api/UserAuthentication/changePassword",
  "/api/UserAuthentication/deleteAccount",

  // TaskManager - All actions require user ownership verification
  "/api/TaskManager/createTask",
  "/api/TaskManager/updateTask",
  "/api/TaskManager/markStarted",
  "/api/TaskManager/markComplete",
  "/api/TaskManager/deleteTask",
  "/api/TaskManager/deleteUserTasks",
  "/api/TaskManager/getTask",
  "/api/TaskManager/getTasks",
  "/api/TaskManager/getTaskStatus",

  // MicroBet - All actions require user authorization
  "/api/MicroBet/initializeBettor",
  "/api/MicroBet/removeBettor",
  "/api/MicroBet/placeBet",
  "/api/MicroBet/cancelBet",
  "/api/MicroBet/resolveBet", // BACKEND-ONLY: triggered by syncs
  "/api/MicroBet/resolveExpiredBet", // BACKEND-ONLY: triggered by scheduled automation
  "/api/MicroBet/getBet",
  "/api/MicroBet/getActiveBets",
  "/api/MicroBet/getExpiredBets",
  "/api/MicroBet/getUserProfile",
  "/api/MicroBet/getRecentActivity",

  // EmotionLogger - All actions require user authorization
  "/api/EmotionLogger/logBefore",
  "/api/EmotionLogger/logAfter",
  "/api/EmotionLogger/deleteTaskLogs",
  "/api/EmotionLogger/deleteUserLogs",
  "/api/EmotionLogger/analyzeRecentEmotions",
  "/api/EmotionLogger/getEmotionsForTask",
  "/api/EmotionLogger/getEmotionLogs",
  "/api/EmotionLogger/getEmotionStats",

  // NudgeEngine - All actions require user authorization
  "/api/NudgeEngine/scheduleNudge", // BACKEND-ONLY: triggered automatically by AutoScheduleNudgeOnTaskCreate sync
  "/api/NudgeEngine/cancelNudge",
  "/api/NudgeEngine/deleteUserNudges",
  "/api/NudgeEngine/nudgeUser", // BACKEND-ONLY: triggered automatically
  "/api/NudgeEngine/getNudge",
  "/api/NudgeEngine/getUserNudges",
  "/api/NudgeEngine/getReadyNudges",

  // Private helper methods (not meant to be public routes)
  "/api/EmotionLogger/logPhase",
  "/api/EmotionLogger/getUserLogs",
  "/api/EmotionLogger/getLogsForTask",
  "/api/EmotionLogger/buildAnalysisPrompt",
  "/api/MicroBet/calculateReward",
  "/api/NudgeEngine/buildPrompt",
  "/api/NudgeEngine/validateMessage",
  "/api/UserAuthentication/generateToken",
  "/api/UserAuthentication/verifyToken",
  "/api/UserAuthentication/isValidEmail",
];
