# TaskManager Changelog

## 10/12/2025

### Initial Specification Refactoring

In comparison to Assignment 2, this new iteration of the concept spec removes from the state the mapping of users to a set of tasks, and instead has every task track which user it belongs to. This simplifies my database logic, as I can query for all tasks that belong to a specific user. I've also made some changes to an individual task, using attributes that align more with a task manager while also holding state that is useful for other features. 