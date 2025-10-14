# FocusFlow Concept Synchronizations

```
sync InitializeUserState
when 
	UserAuthentication.register (username, password, email): (user)
then 
	MicroBet.initializeBettor (user)
```

```
sync CascadeAccountDeletion
when 
    UserAuthentication.deleteAccount (user)
then 
    TaskManager.deleteAllTasks (user)
    EmotionLoggerAI.deleteUserLogs (user)
    MicroBet.deleteUserBets (user)
    NudgeScheduler.deleteUserNudges (user)
```

```
sync ScheduleNudgeOnTaskCreation
when 
	TaskManager.createTask (user, title, description, dueDate): (task)
then 
	NudgeEngine.scheduleNudge (user, task, f(dueDate))
```

```
sync OnTaskDeletion
when 
	TaskManager.deleteTask (user, task)
then 
	NudgeEngine.cancelNudge (user, task)
  EmotionLogger.removeTaskLog(user, task)
  MicroBet.getUsersBet(user, task): (bet)
  MicroBet.removeBet(bet)
```

```
sync ReflectOnTaskCompletion
when 
  TaskManager.markComplete (user, task)
then 
  EmotionLogger.logEmotion (user, task, "after", emotion)
```

```
sync ResolveBetOnTaskCompletion
when 
  TaskManager.markComplete (user, task)
where 
  in MicroBet: bet.task = task and bet.user = user and currentTime < bet.deadline
then 
  MicroBet.completeBet (user, task)
```