# UserAuthentication Changelog

### Initial Specification Composition

This concept is something I realized should be part of my application so it's been added.

### Implementation Specification Refactoring

As I was implementing this concept, action requirements and effects where constantly being refined. 

### Session Token Implementation

Rather than using a boolean to indicate log-in status, I refactored the concept to use session tokens that expire after a set time and must be consistently refresh by users to remain logged in. I also added proper hashing to the passwords for good security.
