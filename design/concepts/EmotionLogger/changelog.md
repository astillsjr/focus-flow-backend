# EmotionLogger Changelog

## 10/12/2025

### Initial Specification Refactoring

In comparison to Assignment 2, this new iteration of the concept spec is actually complete. The timestamp attribute was removed as I didn't feel as it was necessary. The set of users mapping to sets logs is now changed to have logs track which users they belong to.  

### Implementation Specification Refactoring

As I was implementing this concept, action requirements and effects where constantly being refined. I added an attribute to Logs to track when a log was created. To make my API easier to use, I separated logEmotion into logBefore and logAfter. 