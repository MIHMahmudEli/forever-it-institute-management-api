import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../src/common/guards/roles.guard.js';
import { UserRole } from '../src/users/entities/user.entity.js';
import { UsersService } from '../src/users/users.service.js';
import * as bcrypt from 'bcrypt';

describe('Role-Based Access Control (RBAC) & Staff Security', () => {
  describe('RolesGuard Unit Tests', () => {
    let rolesGuard: RolesGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      rolesGuard = new RolesGuard(reflector);
    });

    const createMockExecutionContext = (user: any, requiredRoles?: UserRole[]) => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
      return {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
      } as any;
    };

    it('allows access when no roles are specified', () => {
      const context = createMockExecutionContext({ role: UserRole.STAFF }, undefined);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('allows ADMIN access to endpoints requiring ADMIN', () => {
      const context = createMockExecutionContext({ role: UserRole.ADMIN }, [UserRole.ADMIN]);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('allows ADMIN access to any role-restricted endpoint', () => {
      const context = createMockExecutionContext({ role: UserRole.ADMIN }, [UserRole.STAFF]);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('denies STAFF access to ADMIN-only endpoints', () => {
      const context = createMockExecutionContext({ role: UserRole.STAFF }, [UserRole.ADMIN]);
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('allows STAFF access to endpoints permitting STAFF', () => {
      const context = createMockExecutionContext({ role: UserRole.STAFF }, [UserRole.ADMIN, UserRole.STAFF]);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('denies access when user is not present in request', () => {
      const context = createMockExecutionContext(null, [UserRole.ADMIN]);
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('UsersService Staff and Account Management Safeguards', () => {
    let usersService: UsersService;
    let mockUsersRepo: any;
    let mockAuditLogsService: any;

    beforeEach(() => {
      mockUsersRepo = {
        findOne: vi.fn(),
        find: vi.fn(),
        create: vi.fn(),
        save: vi.fn(),
        count: vi.fn(),
      };

      mockAuditLogsService = {
        log: vi.fn().mockResolvedValue(undefined),
      };

      usersService = new UsersService(mockUsersRepo, mockAuditLogsService);
    });

    it('creates staff account with hashed password and forced STAFF role', async () => {
      mockUsersRepo.findOne.mockResolvedValue(null);
      mockUsersRepo.create.mockImplementation((dto: any) => ({
        id: 'staff-uuid-1',
        ...dto,
      }));
      mockUsersRepo.save.mockImplementation(async (user: any) => ({
        ...user,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await usersService.createStaff(
        {
          fullName: 'Jane Staff',
          email: 'jane@foreveritbd.com',
          password: 'Password123!',
          phone: '01711223344',
          isActive: true,
        },
        'admin-uuid-1',
      );

      expect(mockUsersRepo.findOne).toHaveBeenCalledWith({ where: { email: 'jane@foreveritbd.com' } });
      expect(mockUsersRepo.create).toHaveBeenCalled();
      const createArgs = mockUsersRepo.create.mock.calls[0][0];
      expect(createArgs.role).toBe(UserRole.STAFF);
      expect(createArgs.email).toBe('jane@foreveritbd.com');
      // Password must be hashed with bcrypt
      expect(createArgs.passwordHash).toBeDefined();
      expect(await bcrypt.compare('Password123!', createArgs.passwordHash)).toBe(true);
      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STAFF_CREATED',
          performedBy: 'admin-uuid-1',
        }),
      );
    });

    it('prevents creating duplicate email accounts', async () => {
      mockUsersRepo.findOne.mockResolvedValue({ id: 'existing-id', email: 'jane@foreveritbd.com' });

      await expect(
        usersService.createStaff(
          {
            fullName: 'Jane Staff',
            email: 'jane@foreveritbd.com',
            password: 'Password123!',
          },
          'admin-uuid-1',
        ),
      ).rejects.toThrow();
    });

    it('prevents self-deactivation', async () => {
      mockUsersRepo.findOne.mockResolvedValue({ id: 'user-1', role: UserRole.ADMIN, isActive: true });

      await expect(
        usersService.updateStaffStatus('user-1', false, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('prevents deactivating the last active administrator', async () => {
      const targetAdmin = {
        id: 'admin-2',
        role: UserRole.ADMIN,
        isActive: true,
      };
      mockUsersRepo.findOne.mockResolvedValue(targetAdmin);
      // Only 1 active admin
      mockUsersRepo.count.mockResolvedValue(1);

      await expect(
        usersService.updateStaffStatus('admin-2', false, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows deactivating an administrator when multiple active admins exist', async () => {
      const targetAdmin = {
        id: 'admin-2',
        role: UserRole.ADMIN,
        isActive: true,
      };
      mockUsersRepo.findOne.mockResolvedValue(targetAdmin);
      mockUsersRepo.count.mockResolvedValue(2);
      mockUsersRepo.save.mockImplementation(async (u: any) => u);

      const result = await usersService.updateStaffStatus('admin-2', false, 'admin-1');
      expect(result.isActive).toBe(false);
      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STAFF_DEACTIVATED',
          performedBy: 'admin-1',
        }),
      );
    });

    it('allows activating/deactivating a staff member', async () => {
      const targetStaff = {
        id: 'staff-1',
        role: UserRole.STAFF,
        isActive: true,
      };
      mockUsersRepo.findOne.mockResolvedValue(targetStaff);
      mockUsersRepo.save.mockImplementation(async (u: any) => u);

      const result = await usersService.updateStaffStatus('staff-1', false, 'admin-1');
      expect(result.isActive).toBe(false);
      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STAFF_DEACTIVATED',
          performedBy: 'admin-1',
        }),
      );
    });

    it('rejects password change if current password does not match', async () => {
      const oldHashedPassword = await bcrypt.hash('CorrectCurrent123!', 10);
      mockUsersRepo.findOne.mockResolvedValue({
        id: 'user-1',
        passwordHash: oldHashedPassword,
        isActive: true,
      });

      await expect(
        usersService.changePassword('user-1', {
          currentPassword: 'WrongPassword!',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow();
    });

    it('rejects password change if new password is identical to current password', async () => {
      const oldHashedPassword = await bcrypt.hash('SamePassword123!', 10);
      mockUsersRepo.findOne.mockResolvedValue({
        id: 'user-1',
        passwordHash: oldHashedPassword,
        isActive: true,
      });

      await expect(
        usersService.changePassword('user-1', {
          currentPassword: 'SamePassword123!',
          newPassword: 'SamePassword123!',
          confirmPassword: 'SamePassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully changes password when verified and passes policy', async () => {
      const oldHashedPassword = await bcrypt.hash('OldPassword123!', 10);
      const user = {
        id: 'user-1',
        passwordHash: oldHashedPassword,
        isActive: true,
      };
      mockUsersRepo.findOne.mockResolvedValue(user);
      mockUsersRepo.save.mockImplementation(async (u: any) => u);

      const res = await usersService.changePassword('user-1', {
        currentPassword: 'OldPassword123!',
        newPassword: 'BrandNewPassword123!',
        confirmPassword: 'BrandNewPassword123!',
      });

      expect(res.message).toBe('Password changed successfully. Please keep your credentials secure.');
      expect(user.passwordHash).not.toBe('BrandNewPassword123!');
      expect(user.passwordHash).not.toBe(oldHashedPassword);
      expect(await bcrypt.compare('BrandNewPassword123!', user.passwordHash)).toBe(true);
      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PASSWORD_CHANGED',
          performedBy: 'user-1',
        }),
      );
    });
  });
});
