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
    * **effects**: Creates a new user with the provided username and password. 
  * `login (username: String, password: String): (user: User)`
    * **requires**: The user exists with matching username and password.
    * **effects**: Sets the user's status to logged in.
  * `logout (user: User)`
    * **requires**: The user exists and is logged in.
    * **effects**: Sets the user's status to logged out.
  * `changePassword (user: User, oldPassword: string, newPassword: String)`
    * **requires**: The user exists and is logged in. The old password matches the user's current password.
    * **effects**: Updates the user's password to the new password.
  * `deleteAccount (user: User, password: string)`
    * **requires**: The user exists and is logged in. The password matches the user's.
    * **effects**: Removes the user from the registry.