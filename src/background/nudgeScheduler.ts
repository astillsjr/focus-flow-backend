/**
 * Background scheduler for automatically processing ready nudges.
 * Ensures nudges are triggered and messages are generated even when no frontend clients are connected.
 */

import { getDb } from "@utils/database.ts";
import UserAuthenticationConcept from "@concepts/UserAuthentication/UserAuthenticationConcept.ts";
import NudgeEngineConcept from "@concepts/NudgeEngine/NudgeEngineConcept.ts";
import TaskManagerConcept from "@concepts/TaskManager/TaskManagerConcept.ts";
import EmotionLoggerConcept from "@concepts/EmotionLogger/EmotionLoggerConcept.ts";

const NUDGE_CHECK_INTERVAL = 60 * 1000; // 60 seconds

/**
 * Processes ready nudges for all users.
 * For each ready nudge, triggers it by calling nudgeUser with task details and emotions.
 */
async function processReadyNudges() {
  const [db] = await getDb();
  const userAuth = new UserAuthenticationConcept(db);
  const nudgeEngine = new NudgeEngineConcept(db);
  const taskManager = new TaskManagerConcept(db);
  const emotionLogger = new EmotionLoggerConcept(db);

  try {
    // Get all users
    const allUsers = await userAuth.users.find({}).toArray();
    
    let totalProcessed = 0;
    let totalErrors = 0;

    for (const userDoc of allUsers) {
      const user = userDoc._id;
      
      try {
        // Get ready nudges for this user
        const readyNudgesResult = await nudgeEngine.getReadyNudges({ user });
        
        if ("nudges" in readyNudgesResult && readyNudgesResult.nudges.length > 0) {
          for (const nudge of readyNudgesResult.nudges) {
            try {
              // Get task details needed to trigger the nudge
              const taskResult = await taskManager.getTask({ user, task: nudge.task });
              if ("error" in taskResult) {
                console.error(`[NudgeScheduler] Failed to get task ${nudge.task} for nudge ${nudge._id}:`, taskResult.error);
                totalErrors++;
                continue;
              }

              // Get recent emotions
              const emotionsResult = await emotionLogger.analyzeRecentEmotions({ user });
              const recentEmotions = "emotions" in emotionsResult ? emotionsResult.emotions : [];

              // Trigger the nudge to generate message
              const nudgeResult = await nudgeEngine.nudgeUser({
                user,
                task: nudge.task,
                title: taskResult.title,
                description: taskResult.description || "",
                recentEmotions,
              });

              if ("message" in nudgeResult) {
                totalProcessed++;
                console.log(`[NudgeScheduler] Triggered nudge ${nudge._id} for user ${user}, task ${nudge.task}`);
              } else {
                // If nudge was already triggered (race condition), that's fine
                if (nudgeResult.error?.includes("already been triggered")) {
                  // Already processed, skip
                  continue;
                } else {
                  console.error(`[NudgeScheduler] Failed to trigger nudge ${nudge._id}:`, nudgeResult.error);
                  totalErrors++;
                }
              }
            } catch (error) {
              console.error(`[NudgeScheduler] Error processing nudge ${nudge._id} for user ${user}:`, error);
              totalErrors++;
            }
          }
        }
      } catch (error) {
        console.error(`[NudgeScheduler] Error checking nudges for user ${user}:`, error);
        totalErrors++;
      }
    }

    if (totalProcessed > 0 || totalErrors > 0) {
      console.log(`[NudgeScheduler] Processed ${totalProcessed} nudges, ${totalErrors} errors`);
    }
  } catch (error) {
    console.error("[NudgeScheduler] Error processing ready nudges:", error);
  }
}

/**
 * Starts the background nudge scheduler.
 * Sets up an interval to process ready nudges periodically.
 */
export function startNudgeScheduler() {
  console.log(`[NudgeScheduler] Starting background scheduler...`);
  console.log(`[NudgeScheduler] Will check for ready nudges every ${NUDGE_CHECK_INTERVAL / 1000} seconds`);
  
  // Process ready nudges every 60 seconds
  setInterval(() => {
    processReadyNudges().catch((error) => {
      console.error("[NudgeScheduler] Unhandled error in nudge processing:", error);
    });
  }, NUDGE_CHECK_INTERVAL);
  
  // Run immediately on startup to process any pending nudges
  processReadyNudges().catch((error) => {
    console.error("[NudgeScheduler] Error on initial nudge processing:", error);
  });
}

