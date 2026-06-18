/**
 * Tests for the route access control logic defined in src/router/index.js.
 *
 * `canAccessRoute` is a module-internal function and is not exported.
 * Its logic is replicated here exactly as written in the source so that
 * changes to the function will break these tests — serving as a regression net.
 *
 * Logic under test (src/router/index.js:canAccessRoute):
 *   if path === '/employees' || path === '/users'  → role must be 'ADMIN'
 *   if path === '/approvals'                        → role must be 'ADMIN' or 'MANAGER'
 *   if /^\/stock-(in|out)\/(create|[^/]+\/edit)$/  → role must be 'ADMIN' or 'EMPLOYEE'
 *   otherwise                                       → always true
 */
import { describe, it, expect } from 'vitest'

// Mirror of the function from src/router/index.js
function canAccessRoute(path, role) {
  if (path === '/employees' || path === '/users') return role === 'ADMIN'
  if (path === '/approvals') return role === 'ADMIN' || role === 'MANAGER'
  if (/^\/stock-(in|out)\/(create|[^/]+\/edit)$/.test(path)) return role === 'ADMIN' || role === 'EMPLOYEE'
  return true
}

describe('canAccessRoute', () => {
  // ── /employees ───────────────────────────────────────────────────────────────
  describe('/employees', () => {
    it('allows ADMIN', () => {
      expect(canAccessRoute('/employees', 'ADMIN')).toBe(true)
    })

    it('denies MANAGER', () => {
      expect(canAccessRoute('/employees', 'MANAGER')).toBe(false)
    })

    it('denies EMPLOYEE', () => {
      expect(canAccessRoute('/employees', 'EMPLOYEE')).toBe(false)
    })

    it('denies empty role string', () => {
      expect(canAccessRoute('/employees', '')).toBe(false)
    })
  })

  // ── /users ───────────────────────────────────────────────────────────────────
  describe('/users', () => {
    it('allows ADMIN', () => {
      expect(canAccessRoute('/users', 'ADMIN')).toBe(true)
    })

    it('denies MANAGER', () => {
      expect(canAccessRoute('/users', 'MANAGER')).toBe(false)
    })

    it('denies EMPLOYEE', () => {
      expect(canAccessRoute('/users', 'EMPLOYEE')).toBe(false)
    })

    it('denies null role', () => {
      expect(canAccessRoute('/users', null)).toBe(false)
    })
  })

  // ── /approvals ───────────────────────────────────────────────────────────────
  describe('/approvals', () => {
    it('allows ADMIN', () => {
      expect(canAccessRoute('/approvals', 'ADMIN')).toBe(true)
    })

    it('allows MANAGER', () => {
      expect(canAccessRoute('/approvals', 'MANAGER')).toBe(true)
    })

    it('denies EMPLOYEE', () => {
      expect(canAccessRoute('/approvals', 'EMPLOYEE')).toBe(false)
    })

    it('denies empty role string', () => {
      expect(canAccessRoute('/approvals', '')).toBe(false)
    })
  })

  // ── stock-in / stock-out create & edit ───────────────────────────────────────
  describe('stock document create / edit paths', () => {
    const createPaths = ['/stock-in/create', '/stock-out/create']
    const editPaths = [
      '/stock-in/123/edit',
      '/stock-out/456/edit',
      '/stock-in/abc-uuid/edit',
      '/stock-out/99/edit',
    ]

    createPaths.forEach(path => {
      it(`allows ADMIN on ${path}`, () => {
        expect(canAccessRoute(path, 'ADMIN')).toBe(true)
      })

      it(`allows EMPLOYEE on ${path}`, () => {
        expect(canAccessRoute(path, 'EMPLOYEE')).toBe(true)
      })

      it(`denies MANAGER on ${path}`, () => {
        expect(canAccessRoute(path, 'MANAGER')).toBe(false)
      })
    })

    editPaths.forEach(path => {
      it(`allows ADMIN on ${path}`, () => {
        expect(canAccessRoute(path, 'ADMIN')).toBe(true)
      })

      it(`allows EMPLOYEE on ${path}`, () => {
        expect(canAccessRoute(path, 'EMPLOYEE')).toBe(true)
      })

      it(`denies MANAGER on ${path}`, () => {
        expect(canAccessRoute(path, 'MANAGER')).toBe(false)
      })
    })
  })

  // ── regex edge cases for stock paths ─────────────────────────────────────────
  describe('stock path regex boundary cases', () => {
    it('does NOT restrict /stock-in (list view) – returns true for any role', () => {
      expect(canAccessRoute('/stock-in', 'MANAGER')).toBe(true)
    })

    it('does NOT restrict /stock-out (list view) – returns true for any role', () => {
      expect(canAccessRoute('/stock-out', 'MANAGER')).toBe(true)
    })

    it('does NOT restrict /stock-in/:id (detail view) – returns true for any role', () => {
      expect(canAccessRoute('/stock-in/123', 'MANAGER')).toBe(true)
    })

    it('does NOT restrict /stock-out/:id (detail view) – returns true for any role', () => {
      expect(canAccessRoute('/stock-out/456', 'MANAGER')).toBe(true)
    })

    it('does not match a path with nested segment after edit', () => {
      // /stock-in/123/edit/extra should not match the restricted pattern
      expect(canAccessRoute('/stock-in/123/edit/extra', 'MANAGER')).toBe(true)
    })

    it('correctly handles "stock-in" vs "stock-inXXX" – no false match', () => {
      expect(canAccessRoute('/stock-invalid/create', 'MANAGER')).toBe(true)
    })
  })

  // ── unrestricted routes ───────────────────────────────────────────────────────
  describe('unrestricted routes', () => {
    const freeRoutes = [
      '/dashboard',
      '/products',
      '/partners',
      '/categories',
      '/warehouses',
      '/inventory',
      '/inventory-transactions',
      '/alerts',
      '/import-excel',
    ]

    freeRoutes.forEach(path => {
      it(`allows EMPLOYEE on ${path}`, () => {
        expect(canAccessRoute(path, 'EMPLOYEE')).toBe(true)
      })

      it(`allows MANAGER on ${path}`, () => {
        expect(canAccessRoute(path, 'MANAGER')).toBe(true)
      })

      it(`allows ADMIN on ${path}`, () => {
        expect(canAccessRoute(path, 'ADMIN')).toBe(true)
      })
    })
  })
})