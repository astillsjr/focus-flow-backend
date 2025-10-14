# concept: UserAuthentication

* **concept**: UserAuthentication 
* **purpose**: To authenticate users so that each person’s data is securely associated with their identity and protected from unauthorized access.
* **principle**: If a user registers with a username and password, then later logs in using those same credentials, the system recognizes them as the same user, enabling access to their personalized FocusFlow data. If they log out, their session ends and their private data becomes inaccessible until they log in again.
* **state**:
  * A set of `Users` with
    * a `username` of type `String`
    * a `passwordHash` of type `String`
    * a `email` of type `String`
    * a `isLoggedIn` of type `Boolean`
* **actions**:
  * `register (username: String, password: String, email: String): (user: User)`
    * **requires**: The username not already taken. 
    * **effects**: Creates a new User with username and passwordHash := hash(password). Sets `isLoggedIn` := true. 
  * `login (username: String, password: String): (user: User)`
    * **requires**: The user exists with matching username and hash(password) = passwordHash.
    * **effects**: Sets the specified user's `isLoggedIn` = true.
  * `logout (user: User)`
    * **requires**: The user is logged in.
    * **effects**: Sets the specified user's `isLoggedIn` = false.
  * `resetPassword (user: User, newPassword: String)`
    * **requires**: The user is logged in.
    * **effects**: Updates the specified user's `passwordHash` := hash(newPassword).
  * `deleteAccount (user: User)`
    * **requires**: The user is logged in.
    * **effects**: Removes the user from the set of all registered users.
* **queries**:
  * `isAuthenticated (user: User): (user: User)`
    * **effects**: Returns whether the user is currently logged in.
  * `getCurrentUser (): (user: User?)`
    * **effects**: Returns the currently logged-in user, or null if none.