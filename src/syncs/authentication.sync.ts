/**
 * Authentication synchronizations for UserAuthentication concept.
 * Handles token validation and authentication-related actions.
 */

import { UserAuthentication, Requesting } from "@concepts";
import { actions, Sync } from "@engine";

// ============================================================================
// LOGOUT
// ============================================================================

export const LogoutRequest: Sync = ({ request, refreshToken }) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/logout", refreshToken },
    { request },
  ]),
  then: actions([UserAuthentication.logout, { refreshToken }]),
});

export const LogoutResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/logout" }, { request }],
    [UserAuthentication.logout, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const LogoutResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/logout" }, { request }],
    [UserAuthentication.logout, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// REFRESH ACCESS TOKEN
// ============================================================================

export const RefreshAccessTokenRequest: Sync = ({ request, refreshToken }) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/refreshAccessToken", refreshToken },
    { request },
  ]),
  then: actions([UserAuthentication.refreshAccessToken, { refreshToken }]),
});

export const RefreshAccessTokenResponse: Sync = ({ request, accessToken }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/refreshAccessToken" }, { request }],
    [UserAuthentication.refreshAccessToken, {}, { accessToken }],
  ),
  then: actions([Requesting.respond, { request, accessToken }]),
});

export const RefreshAccessTokenResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/refreshAccessToken" }, { request }],
    [UserAuthentication.refreshAccessToken, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// GET USER INFO
// ============================================================================

export const GetUserInfoRequest: Sync = ({ request, accessToken }) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/getUserInfo", accessToken },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const GetUserInfoResponse: Sync = ({ request, user }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/getUserInfo" }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  then: actions([Requesting.respond, { request, user }]),
});

export const GetUserInfoResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/getUserInfo" }, { request }],
    [UserAuthentication.getUserInfo, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// CHANGE PASSWORD
// ============================================================================

export const ChangePasswordRequest: Sync = ({ request, accessToken, oldPassword, newPassword }) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/changePassword", accessToken, oldPassword, newPassword },
    { request },
  ]),
  then: actions([UserAuthentication.changePassword, { accessToken, oldPassword, newPassword }]),
});

export const ChangePasswordResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/changePassword" }, { request }],
    [UserAuthentication.changePassword, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const ChangePasswordResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/changePassword" }, { request }],
    [UserAuthentication.changePassword, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// DELETE ACCOUNT
// ============================================================================

export const DeleteAccountRequest: Sync = ({ request, accessToken, password }) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/deleteAccount", accessToken, password },
    { request },
  ]),
  then: actions([UserAuthentication.deleteAccount, { accessToken, password }]),
});

export const DeleteAccountResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/deleteAccount" }, { request }],
    [UserAuthentication.deleteAccount, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const DeleteAccountResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/deleteAccount" }, { request }],
    [UserAuthentication.deleteAccount, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

