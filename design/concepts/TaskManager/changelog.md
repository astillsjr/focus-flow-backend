# TaskManager Changelog

### Initial Specification Refactoring

In comparison to Assignment 2, this new iteration of the concept spec removes from the state the mapping of users to a set of tasks, and instead has every task track which user it belongs to. This simplifies my database logic, as I can query for all tasks that belong to a specific user. I've also made some changes to an individual task, using attributes that align more with a task manager while also holding state that is useful for other features. 

### Implementation Specification Refactoring

As I was implementing this concept, action requirements and effects where constantly being modified. I realized that task titles should be unique so I added requirements for that. I also realized it may make more sense for a timestamp to be provided when marking a task as started or complete (to prevent discrepencies from concurrency). This led to me to replacing the completed boolean with a completedAt date. 