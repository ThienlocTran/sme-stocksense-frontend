import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock axios before importing authService
vi.mock('axios', () => {
  const mockPost = vi.fn()
  const mockPatch = vi.fn()
  const mockCreate = vi.fn(() => ({
    post: mockPost,
    patch: mockPatch,
  }))
  return {
    default: {
      create: mockCreate,
      post: mockPost,
      patch: mockPatch,
    },
  }
})

import axios from 'axios'
import {
  AUTH_STORAGE_KEYS,
  AUTH_ROLE_LABELS,
  login,
  changeOwnPassword,
  getAccessToken,
  isAuthenticated,
  getCurrentUser,
  getAuthorizationHeader,
  getCurrentRoleCode,
  getCurrentRoleLabel,
  formatRole,
  clearAuth,
} from '../services/authService'

const STORAGE_KEYS = AUTH_STORAGE_KEYS

function seedStorage({ accessToken = 'test-token', tokenType = 'Bearer', expiresIn = 3600, loginAt = Date.now(), user = { employeeId: 1, fullName: 'Test User', email: 'test@example.com', role: 'ADMIN', status: 'HOAT_DONG' } } = {}) {
  localStorage.setItem(STORAGE_KEYS.accessToken, accessToken)
  localStorage.setItem(STORAGE_KEYS.tokenType, tokenType)
  localStorage.setItem(STORAGE_KEYS.expiresIn, String(expiresIn))
  localStorage.setItem(STORAGE_KEYS.loginAt, String(loginAt))
  localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user))
}

describe('AUTH_STORAGE_KEYS', () => {
  it('contains the expected keys', () => {
    expect(STORAGE_KEYS.accessToken).toBe('stocksense_access_token')
    expect(STORAGE_KEYS.tokenType).toBe('stocksense_token_type')
    expect(STORAGE_KEYS.expiresIn).toBe('stocksense_expires_in')
    expect(STORAGE_KEYS.loginAt).toBe('stocksense_login_at')
    expect(STORAGE_KEYS.currentUser).toBe('stocksense_current_user')
  })
})

describe('AUTH_ROLE_LABELS', () => {
  it('has labels for all three roles', () => {
    expect(AUTH_ROLE_LABELS.ADMIN).toBe('Admin / IT')
    expect(AUTH_ROLE_LABELS.MANAGER).toBe('Quản lý kho')
    expect(AUTH_ROLE_LABELS.EMPLOYEE).toBe('Nhân viên kho')
  })
})

describe('clearAuth', () => {
  beforeEach(() => seedStorage())

  it('removes all auth storage keys', () => {
    clearAuth()
    Object.values(STORAGE_KEYS).forEach(key => {
      expect(localStorage.getItem(key)).toBeNull()
    })
  })

  it('removes legacy keys', () => {
    localStorage.setItem('stocksense-demo-role', 'ADMIN')
    localStorage.setItem('user_role', 'ADMIN')
    localStorage.setItem('token', 'abc')
    clearAuth()
    expect(localStorage.getItem('stocksense-demo-role')).toBeNull()
    expect(localStorage.getItem('user_role')).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('is idempotent when storage is already empty', () => {
    clearAuth()
    expect(() => clearAuth()).not.toThrow()
  })
})

describe('getAccessToken', () => {
  beforeEach(() => localStorage.clear())

  it('returns null when no token is stored', () => {
    expect(getAccessToken()).toBeNull()
  })

  it('returns the stored token', () => {
    localStorage.setItem(STORAGE_KEYS.accessToken, 'my-jwt')
    expect(getAccessToken()).toBe('my-jwt')
  })
})

describe('getCurrentUser', () => {
  beforeEach(() => localStorage.clear())

  it('returns null when nothing is stored', () => {
    expect(getCurrentUser()).toBeNull()
  })

  it('parses and returns the stored user object', () => {
    const user = { employeeId: 42, fullName: 'Alice', email: 'alice@example.com', role: 'MANAGER', status: 'HOAT_DONG' }
    localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user))
    expect(getCurrentUser()).toEqual(user)
  })

  it('returns null and calls clearAuth when stored JSON is malformed', () => {
    localStorage.setItem(STORAGE_KEYS.currentUser, '{bad json')
    localStorage.setItem(STORAGE_KEYS.accessToken, 'token')
    const result = getCurrentUser()
    expect(result).toBeNull()
    // clearAuth should have cleared the token too
    expect(localStorage.getItem(STORAGE_KEYS.accessToken)).toBeNull()
  })
})

describe('isAuthenticated', () => {
  beforeEach(() => localStorage.clear())

  it('returns false when no token is stored', () => {
    expect(isAuthenticated()).toBe(false)
  })

  it('returns false when token exists but no user', () => {
    localStorage.setItem(STORAGE_KEYS.accessToken, 'token')
    expect(isAuthenticated()).toBe(false)
  })

  it('returns false when user exists but no token', () => {
    const user = { employeeId: 1, fullName: 'Bob', email: 'b@b.com', role: 'EMPLOYEE', status: 'HOAT_DONG' }
    localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user))
    expect(isAuthenticated()).toBe(false)
  })

  it('returns true when token and user are present and not expired', () => {
    seedStorage({ expiresIn: 3600, loginAt: Date.now() })
    expect(isAuthenticated()).toBe(true)
  })

  it('returns false and clears auth when token is expired', () => {
    const loginAt = Date.now() - 7200 * 1000 // 2 hours ago
    seedStorage({ expiresIn: 3600, loginAt })
    expect(isAuthenticated()).toBe(false)
    expect(localStorage.getItem(STORAGE_KEYS.accessToken)).toBeNull()
  })

  it('returns true when expiresIn is 0 (no expiry)', () => {
    seedStorage({ expiresIn: 0, loginAt: Date.now() - 99999 * 1000 })
    expect(isAuthenticated()).toBe(true)
  })

  it('clears partial auth state when only token is present without user', () => {
    localStorage.setItem(STORAGE_KEYS.accessToken, 'token')
    isAuthenticated()
    expect(localStorage.getItem(STORAGE_KEYS.accessToken)).toBeNull()
  })

  it('clears partial auth state when only user is present without token', () => {
    const user = { employeeId: 1, fullName: 'Bob', email: 'b@b.com', role: 'EMPLOYEE', status: 'HOAT_DONG' }
    localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user))
    isAuthenticated()
    expect(localStorage.getItem(STORAGE_KEYS.currentUser)).toBeNull()
  })
})

describe('getAuthorizationHeader', () => {
  beforeEach(() => localStorage.clear())

  it('returns empty object when no token', () => {
    expect(getAuthorizationHeader()).toEqual({})
  })

  it('returns Bearer Authorization header when token is present', () => {
    localStorage.setItem(STORAGE_KEYS.accessToken, 'abc123')
    localStorage.setItem(STORAGE_KEYS.tokenType, 'Bearer')
    expect(getAuthorizationHeader()).toEqual({ Authorization: 'Bearer abc123' })
  })

  it('uses stored token type', () => {
    localStorage.setItem(STORAGE_KEYS.accessToken, 'xyz')
    localStorage.setItem(STORAGE_KEYS.tokenType, 'Token')
    expect(getAuthorizationHeader()).toEqual({ Authorization: 'Token xyz' })
  })

  it('defaults to Bearer when tokenType is missing', () => {
    localStorage.setItem(STORAGE_KEYS.accessToken, 'xyz')
    expect(getAuthorizationHeader()).toEqual({ Authorization: 'Bearer xyz' })
  })
})

describe('getCurrentRoleCode', () => {
  beforeEach(() => localStorage.clear())

  it('returns empty string when no user is stored', () => {
    expect(getCurrentRoleCode()).toBe('')
  })

  it('returns the role code directly when already a code', () => {
    seedStorage({ user: { role: 'ADMIN' } })
    expect(getCurrentRoleCode()).toBe('ADMIN')
  })

  it('maps role label "Admin / IT" to "ADMIN"', () => {
    seedStorage({ user: { role: 'Admin / IT' } })
    expect(getCurrentRoleCode()).toBe('ADMIN')
  })

  it('maps role label "Quản lý kho" to "MANAGER"', () => {
    seedStorage({ user: { role: 'Quản lý kho' } })
    expect(getCurrentRoleCode()).toBe('MANAGER')
  })

  it('maps role label "Nhân viên kho" to "EMPLOYEE"', () => {
    seedStorage({ user: { role: 'Nhân viên kho' } })
    expect(getCurrentRoleCode()).toBe('EMPLOYEE')
  })

  it('returns the raw value for unknown role', () => {
    seedStorage({ user: { role: 'UNKNOWN_ROLE' } })
    expect(getCurrentRoleCode()).toBe('UNKNOWN_ROLE')
  })
})

describe('getCurrentRoleLabel', () => {
  beforeEach(() => localStorage.clear())

  it('returns empty string when no user', () => {
    expect(getCurrentRoleLabel()).toBe('')
  })

  it('returns "Admin / IT" for ADMIN role', () => {
    seedStorage({ user: { role: 'ADMIN' } })
    expect(getCurrentRoleLabel()).toBe('Admin / IT')
  })

  it('returns "Quản lý kho" for MANAGER role', () => {
    seedStorage({ user: { role: 'MANAGER' } })
    expect(getCurrentRoleLabel()).toBe('Quản lý kho')
  })

  it('returns "Nhân viên kho" for EMPLOYEE role', () => {
    seedStorage({ user: { role: 'EMPLOYEE' } })
    expect(getCurrentRoleLabel()).toBe('Nhân viên kho')
  })
})

describe('formatRole', () => {
  it('returns label for role code ADMIN', () => {
    expect(formatRole('ADMIN')).toBe('Admin / IT')
  })

  it('returns label for role code MANAGER', () => {
    expect(formatRole('MANAGER')).toBe('Quản lý kho')
  })

  it('returns label for role code EMPLOYEE', () => {
    expect(formatRole('EMPLOYEE')).toBe('Nhân viên kho')
  })

  it('maps role label string "Admin / IT" to its display label', () => {
    expect(formatRole('Admin / IT')).toBe('Admin / IT')
  })

  it('returns the raw role for unknown values', () => {
    expect(formatRole('SOME_ROLE')).toBe('SOME_ROLE')
  })

  it('returns empty string for null/undefined', () => {
    expect(formatRole(null)).toBe('')
    expect(formatRole(undefined)).toBe('')
    expect(formatRole('')).toBe('')
  })
})

describe('login', () => {
  let mockPost

  beforeEach(() => {
    localStorage.clear()
    mockPost = axios.create().post
    mockPost.mockReset()
  })

  it('stores auth data and returns response on success', async () => {
    const responseData = {
      accessToken: 'jwt-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      employeeId: 1,
      fullName: 'Admin User',
      email: 'admin@example.com',
      role: 'ADMIN',
      status: 'HOAT_DONG',
    }
    mockPost.mockResolvedValue({ data: responseData })

    const result = await login('admin@example.com', 'password')

    expect(result).toEqual(responseData)
    expect(localStorage.getItem(STORAGE_KEYS.accessToken)).toBe('jwt-token')
    expect(localStorage.getItem(STORAGE_KEYS.tokenType)).toBe('Bearer')
    expect(localStorage.getItem(STORAGE_KEYS.expiresIn)).toBe('3600')
    const storedUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.currentUser))
    expect(storedUser.email).toBe('admin@example.com')
    expect(storedUser.role).toBe('ADMIN')
  })

  it('throws normalized error with status and message on HTTP error response', async () => {
    mockPost.mockRejectedValue({
      response: {
        status: 401,
        data: { message: 'Email hoặc mật khẩu không đúng.', errors: {} },
      },
    })

    await expect(login('wrong@example.com', 'wrong')).rejects.toMatchObject({
      status: 401,
      message: 'Email hoặc mật khẩu không đúng.',
      errors: {},
    })
  })

  it('throws normalized error with field errors on 400 response', async () => {
    mockPost.mockRejectedValue({
      response: {
        status: 400,
        data: { message: 'Validation failed', errors: { email: 'Invalid format' } },
      },
    })

    await expect(login('abc', 'pass')).rejects.toMatchObject({
      status: 400,
      errors: { email: 'Invalid format' },
    })
  })

  it('throws network error message when no response (server down)', async () => {
    mockPost.mockRejectedValue(new Error('Network Error'))

    await expect(login('admin@example.com', 'pass')).rejects.toMatchObject({
      status: 0,
      message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.',
    })
  })

  it('uses fallback login error message when backend message is missing', async () => {
    mockPost.mockRejectedValue({
      response: {
        status: 401,
        data: {},
      },
    })

    await expect(login('a@b.com', 'x')).rejects.toMatchObject({
      message: 'Đăng nhập không thành công.',
    })
  })
})

describe('changeOwnPassword', () => {
  let mockPatch

  beforeEach(() => {
    localStorage.clear()
    mockPatch = axios.create().patch
    mockPatch.mockReset()
  })

  it('returns response data on success', async () => {
    const responseData = { message: 'Đổi mật khẩu thành công.' }
    mockPatch.mockResolvedValue({ data: responseData })
    seedStorage()

    const result = await changeOwnPassword({ currentPassword: 'old', newPassword: 'newpass1', confirmPassword: 'newpass1' })
    expect(result).toEqual(responseData)
  })

  it('throws normalized error on 400 response with field errors', async () => {
    mockPatch.mockRejectedValue({
      response: {
        status: 400,
        data: { message: 'Mật khẩu không đúng.', errors: { currentPassword: 'Sai mật khẩu' } },
      },
    })

    await expect(changeOwnPassword({ currentPassword: 'wrong', newPassword: 'new', confirmPassword: 'new' })).rejects.toMatchObject({
      status: 400,
      errors: { currentPassword: 'Sai mật khẩu' },
    })
  })

  it('clears auth and throws normalized error on 401 response', async () => {
    seedStorage()
    mockPatch.mockRejectedValue({
      response: {
        status: 401,
        data: { message: 'Unauthorized' },
      },
    })

    await expect(changeOwnPassword({})).rejects.toMatchObject({ status: 401 })
    expect(localStorage.getItem(STORAGE_KEYS.accessToken)).toBeNull()
  })

  it('throws network error when server is unreachable', async () => {
    mockPatch.mockRejectedValue(new Error('Network Error'))

    await expect(changeOwnPassword({})).rejects.toMatchObject({
      status: 0,
      message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.',
    })
  })

  it('uses fallback message when backend error message is missing', async () => {
    mockPatch.mockRejectedValue({
      response: {
        status: 500,
        data: {},
      },
    })

    await expect(changeOwnPassword({})).rejects.toMatchObject({
      message: 'Không thể đổi mật khẩu.',
    })
  })
})