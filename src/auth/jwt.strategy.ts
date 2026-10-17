import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  username?: string | null;
  mustChangePassword?: boolean;
  studentId?: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const secret = configService.get<string>('jwt.secret') || 'dev_insecure_jwt_secret_change_in_production';
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub, isActive: true },
      relations: { student: true, teacher: true, parent: true },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists or has been deactivated.');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      studentId: user.student?.id || null,
      teacherId: user.teacher?.id || null,
      parentId: user.parent?.id || null,
      student: user.student,
      teacher: user.teacher,
      parent: user.parent,
    };
  }
}
