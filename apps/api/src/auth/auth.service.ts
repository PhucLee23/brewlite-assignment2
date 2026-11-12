import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';

const BCRYPT_COST = 10; // NFR-03
const WRONG_CREDENTIALS = 'Email hoặc mật khẩu không đúng';

/** Thông tin người dùng trả ra ngoài, không bao giờ có passwordHash */
export function publicUser(user: User) {
  const { id, email, fullName, role, loyaltyPoints } = user;
  return { id, email, fullName, role, loyaltyPoints };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    try {
      const user = await this.prisma.user.create({
        data: { email: dto.email, fullName: dto.fullName, passwordHash },
      });
      return this.session(user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Email đã được đăng ký');
      }
      throw e;
    }
  }

  // Sai email hay sai mật khẩu đều trả cùng một thông báo để không lộ email nào đã đăng ký (FR-07)
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException(WRONG_CREDENTIALS);
    }
    return this.session(user);
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return publicUser(user);
  }

  private session(user: User) {
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    return { accessToken, user: publicUser(user) };
  }
}
