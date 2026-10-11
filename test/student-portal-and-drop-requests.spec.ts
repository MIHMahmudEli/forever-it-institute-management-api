import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTemporaryPassword } from '../src/common/utils/password-generator.util.js';
import {
  MustChangePasswordGuard,
  ALLOW_MUST_CHANGE_PASSWORD_KEY,
} from '../src/common/guards/must-change-password.guard.js';
import { RolesGuard } from '../src/common/guards/roles.guard.js';
import { UserRole } from '../src/users/entities/user.entity.js';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DropRequestStatus } from '../src/drop-requests/entities/drop-request.entity.js';
import { EnrollmentStatus } from '../src/enrollments/entities/enrollment.entity.js';

describe('Temporary Password Generator', () => {
  it('generates a password with default length 10', () => {
    const pwd = generateTemporaryPassword();
    expect(pwd.length).toBe(10);
  });

  it('generates passwords meeting complexity requirements', () => {
    for (let i = 0; i < 20; i++) {
      const pwd = generateTemporaryPassword(12);
      expect(pwd.length).toBe(12);
      expect(/[A-Z]/.test(pwd)).toBe(true);
      expect(/[a-z]/.test(pwd)).toBe(true);
      expect(/[0-9]/.test(pwd)).toBe(true);
      expect(/[!@#$%&*]/.test(pwd)).toBe(true);
    }
  });
});

describe('MustChangePasswordGuard', () => {
  let guard: MustChangePasswordGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new MustChangePasswordGuard(reflector);
  });

  function createMockContext(user: any, isAllowedRoute = false): ExecutionContext {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isAllowedRoute);

    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('allows access if user mustChangePassword is false', () => {
    const context = createMockContext({ id: '1', role: UserRole.STUDENT, mustChangePassword: false });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws ForbiddenException if user mustChangePassword is true on normal routes', () => {
    const context = createMockContext({ id: '1', role: UserRole.STUDENT, mustChangePassword: true }, false);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows access if route is decorated with AllowMustChangePassword even when mustChangePassword is true', () => {
    const context = createMockContext({ id: '1', role: UserRole.STUDENT, mustChangePassword: true }, true);
    expect(guard.canActivate(context)).toBe(true);
  });
});

describe('RolesGuard with STUDENT role', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(user: any, requiredRoles?: UserRole[]): ExecutionContext {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('blocks student from accessing ADMIN or STAFF endpoints', () => {
    const context = createMockContext(
      { id: '1', role: UserRole.STUDENT },
      [UserRole.ADMIN, UserRole.STAFF],
    );
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows student on STUDENT endpoints', () => {
    const context = createMockContext(
      { id: '1', role: UserRole.STUDENT },
      [UserRole.STUDENT],
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('always allows ADMIN across endpoints', () => {
    const context = createMockContext(
      { id: '1', role: UserRole.ADMIN },
      [UserRole.STUDENT],
    );
    expect(guard.canActivate(context)).toBe(true);
  });
});
