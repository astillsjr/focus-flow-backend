# concept: UserAuthentication

* **concept**: UserAuthentication
* **purpose**: To authenticate users so that each person’s data is securely associated with their identity and protected from unauthorized access.
* **principle**: If a user registers with a username and password, then later logs in using those same credentials, the system recognizes them as the same user, enabling access to their personalized FocusFlow data. If they log out, their session ends and their private data becomes inaccessible until they log in again.
* **state**:
  * A set of `Users` with
    * a `username` of type `String`
    * a `hashedPassword` of type `String`
    * a `email` of type `String`
    * a `createdAt` of type `Date`
    * a `refreshToken` of type `String`
* **actions**:
  * `register (username: String, password: String, email: String): (accessToken: string, refreshToken: string)`
    * **requires**: The email and username are not already in use. The email is in a valid email form.
    * **effects**: Creates a new user with the provided username and password and returns the user's session token. 
  * `login (username: String, password: String): (accessToken: string, refreshToken: string)`
    * **requires**: The user with matching username and password exists.
    * **effects**: Returns the user's session token.
  * `logout (refreshToken: string)`
    * **requires**: The refresh token is valid.
    * **effects**: Invalidates the users refresh token.
  * `changePassword (accessToken: string, oldPassword: string, newPassword: String)`
    * **requires**: The access token is valid. The old password matches the user's current password.
    * **effects**: Updates the user's password to the new password.
  * `deleteAccount (accessToken: string, password: string)`
    * **requires**: The access token is valid. The provided password matches the user's current password.
    * **effects**: Deletes the user's account.
  * `refreshAccessToken (refreshToken: string, password: string)`
    * **requires**: The refresh token is valid. The provided password matches the user's current password.
    * **effects**: Generates a new access token for the user.
  * `_getUserInfo (refreshToken: string, password: string)`
    * **requires**: The access token is valid.
    * **effects**: Returns the users username, id, and email.