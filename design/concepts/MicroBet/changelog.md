# MicroBet Changelog

### Initial Specification Refactoring

In comparison to Assignment 2, this new iteration of the concept spec has new state that maps users to their current amount of points and their current streak, something that wasnt't present before (but should've been). Additionally, modified the bets to have more useful attributes and seperated the logic for a successful and unsucessful bet. 

### Implementation Specification Refactoring

As I was implementing this concept, action requirements and effects where constantly being refined. I realized I had two actions that did the same thing (removeBettor and deleteUserBets) so one of them was removed. 