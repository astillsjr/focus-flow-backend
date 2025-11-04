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
    * a `refreshToken` of type `String?`  
      (present while logged in; absent when logged out)
    * a `lastSeenNudgeTimestamp` of type `Date?`
      (optional, tracks when last nudge was sent via SSE)
    * a `lastSeenBetTimestamp` of type `Date?`
      (optional, tracks when last bet event was sent via SSE)
* **actions**:
  * `register (username: String, password: String, email: String): (accessToken: string, refreshToken: string)`
    * **requires**: The provided email and username must not already exist. The email must be in valid format.
    * **effects**: Creates a new user record with a hashed password and returns a new pair of session tokens.
  * `login (username: String, password: String): (accessToken: string, refreshToken: string)`
    * **requires**: The provided username and password must match an existing user account.
    * **effects**: Returns a new pair of access and refresh tokens for the authenticated user.
  * `logout (refreshToken: string)`
    * **requires**: A valid refresh token must be provided.
    * **effects**: Invalidates the user's current refresh token, ending their session.
  * `changePassword (accessToken: string, oldPassword: string, newPassword: String)`
    * **requires**: A valid access token must be provided. The old password must match the user's current password.
    * **effects**: Updates the user's stored password hash to the new password.
  * `deleteAccount (accessToken: string, password: string)`
    * **requires**: A valid access token must be provided. The provided password matches the user's current password.
    * **effects**: Permanently removes the user's account.
  * `refreshAccessToken (refreshToken: string): (accessToken: string)`
    * **requires**: A valid and active refresh token must be provided.
    * **effects**: Generates and returns a new short-lived access token.
  * `getUserInfo (accessToken: string): (user: { id: User, username: String, email: String })`
    * **requires**: A valid access token must be provided.
    * **effects**: Returns the user's ID, username, and email address.
  * `hasActiveSession (user: User): (hasSession: Boolean)`
    * **effects**: Returns true if the user has an active session (refresh token present), false otherwise.
  * `getLastSeenNudgeTimestamp (user: User): (timestamp: Date?)`
    * **effects**: Returns the timestamp when the last nudge was sent, or null if never sent.
  * `getLastSeenBetTimestamp (user: User): (timestamp: Date?)`
    * **effects**: Returns the timestamp when the last bet event was sent, or null if never sent.
  * `updateLastSeenNudgeTimestamp (user: User, timestamp?: Date)`
    * **effects**: Sets the lastSeenNudgeTimestamp to the provided timestamp (or current time if not provided).
  * `updateLastSeenBetTimestamp (user: User, timestamp?: Date)`
    * **effects**: Sets the lastSeenBetTimestamp to the provided timestamp (or current time if not provided).