import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as argon2 from "argon2";
import * as crypto from "crypto";
import { Repository } from "typeorm";
import { ConfigService } from "../config/services/config.service";
import {
  EmailVerification,
  PasswordReset,
  Plan,
  RefreshToken,
  User,
  UserRole,
} from "../database/entities";
import { EmailService } from "../email/email.service";
import {
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
  SignupDto,
} from "./dto";

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    isEmailVerified: boolean;
    plan: {
      id: string;
      name: string;
    };
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepository: Repository<EmailVerification>,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService
  ) {}

  // ====================
  // Password Hashing with Argon2d + Salt + Pepper
  // ====================

  private async hashPassword(password: string): Promise<{
    hash: string;
    salt: string;
  }> {
    // Generate random salt (16 bytes)
    const salt = crypto.randomBytes(16).toString("hex");

    // Add pepper from environment (global secret)
    const pepper = this.configService.passwordPepper;
    const passwordWithPepper = password + pepper;

    // Hash with Argon2d
    const hash = await argon2.hash(passwordWithPepper + salt, {
      type: argon2.argon2d,
      memoryCost: 65536, // 64 MB
      timeCost: 3, // 3 iterations
      parallelism: 1, // 1 thread
      hashLength: 32, // 32 bytes
      salt: Buffer.from(salt, "hex"),
    });

    return { hash, salt };
  }

  private async verifyPassword(
    password: string,
    hash: string,
    salt: string
  ): Promise<boolean> {
    try {
      const pepper = this.configService.passwordPepper;
      const passwordWithPepper = password + pepper;

      return await argon2.verify(hash, passwordWithPepper + salt, {
        type: argon2.argon2d,
      });
    } catch {
      return false;
    }
  }

  // ====================
  // Token Generation
  // ====================

  private generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.jwtSecret,
      expiresIn: this.configService.jwtAccessTokenExpiration,
    });
  }

  private generateRefreshToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.jwtSecret,
      expiresIn: this.configService.jwtRefreshTokenExpiration,
    });
  }

  private generateRandomToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  // ====================
  // User Registration
  // ====================

  async signup(signupDto: SignupDto): Promise<{ message: string }> {
    try {
      const { email, password } = signupDto;

      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new ConflictException("User with this email already exists");
      }

      // Get default Free plan
      let freePlan = await this.planRepository.findOne({
        where: { name: "Free" },
      });

      // Create Free plan if it doesn't exist
      if (!freePlan) {
        freePlan = this.planRepository.create({
          name: "Free",
          description: "Free plan with basic features",
          price: 0,
          dailyRequestLimit: 100,
          monthlyRequestLimit: 3000,
          maxFileSizeMB: 5,
          maxPagesPerPdf: 10,
          maxConcurrentJobs: 1,
          webhooksEnabled: false,
          priorityProcessing: false,
          customWatermark: false,
          apiAccess: true,
          sandboxEnabled: true,
        });
        await this.planRepository.save(freePlan);
      }

      // Hash password with salt and pepper
      const { hash, salt } = await this.hashPassword(password);

      // Create user
      const user = this.userRepository.create({
        email: email.toLowerCase(),
        passwordHash: hash,
        salt,
        role: UserRole.USER,
        isEmailVerified: !this.configService.enableEmailVerification,
        planId: freePlan.id,
      });

      await this.userRepository.save(user);

      // Send verification email if enabled
      if (this.configService.enableEmailVerification) {
        const verificationToken = this.generateRandomToken();
        const verification = this.emailVerificationRepository.create({
          email: user.email,
          token: verificationToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          userId: user.id,
        });
        await this.emailVerificationRepository.save(verification);

        await this.emailService.sendVerificationEmail(
          user.email,
          verificationToken
        );

        return {
          message:
            "User registered successfully. Please check your email to verify your account.",
        };
      }

      // Send welcome email if verification is disabled
      await this.emailService.sendWelcomeEmail(user.email);

      return {
        message: "User registered successfully. You can now log in.",
      };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new HttpException(
        error.message || "Failed to create user account",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ====================
  // Email Verification
  // ====================

  async verifyEmail(token: string): Promise<{ message: string }> {
    try {
      const verification = await this.emailVerificationRepository.findOne({
        where: { token, isUsed: false },
      });

      if (!verification) {
        throw new BadRequestException("Invalid or expired verification token");
      }

      if (verification.expiresAt < new Date()) {
        throw new BadRequestException("Verification token has expired");
      }

      if (!verification.userId) {
        throw new BadRequestException("Invalid verification token");
      }

      // Update user
      const user = await this.userRepository.findOne({
        where: { id: verification.userId },
      });

      if (!user) {
        throw new NotFoundException("User not found");
      }

      user.isEmailVerified = true;
      await this.userRepository.save(user);

      // Mark verification as used
      verification.isUsed = true;
      verification.verifiedAt = new Date();
      await this.emailVerificationRepository.save(verification);

      // Send welcome email
      await this.emailService.sendWelcomeEmail(user.email);

      return { message: "Email verified successfully. You can now log in." };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new HttpException(
        error.message || "Failed to verify email address",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ====================
  // User Login
  // ====================

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ["plan"],
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Account is deactivated");
    }

    if (this.configService.enableEmailVerification && !user.isEmailVerified) {
      throw new UnauthorizedException(
        "Please verify your email before logging in"
      );
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(
      password,
      user.passwordHash,
      user.salt
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generate tokens
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Store refresh token
    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const refreshTokenEntity = this.refreshTokenRepository.create({
      token: hashedRefreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ipAddress,
      userAgent,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        plan: {
          id: user.plan.id,
          name: user.plan.name,
        },
      },
    };
  }

  // ====================
  // Token Refresh
  // ====================

  async refreshTokens(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    try {
      // Verify JWT
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.jwtSecret,
      });

      // Hash the refresh token to compare
      const hashedToken = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      // Find refresh token in database
      const storedToken = await this.refreshTokenRepository.findOne({
        where: {
          token: hashedToken,
          userId: payload.sub,
          isRevoked: false,
        },
      });

      if (!storedToken) {
        throw new UnauthorizedException("Invalid refresh token");
      }

      if (storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException("Refresh token has expired");
      }

      // Get user with plan
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ["plan"],
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException("User not found or inactive");
      }

      // Generate new tokens
      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const newAccessToken = this.generateAccessToken(newPayload);
      const newRefreshToken = this.generateRefreshToken(newPayload);

      // Revoke old refresh token
      storedToken.isRevoked = true;
      storedToken.revokedAt = new Date();
      storedToken.replacedByToken = crypto
        .createHash("sha256")
        .update(newRefreshToken)
        .digest("hex");
      await this.refreshTokenRepository.save(storedToken);

      // Store new refresh token
      const newHashedToken = crypto
        .createHash("sha256")
        .update(newRefreshToken)
        .digest("hex");

      const newTokenEntity = this.refreshTokenRepository.create({
        token: newHashedToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress,
        userAgent,
      });

      await this.refreshTokenRepository.save(newTokenEntity);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          plan: {
            id: user.plan.id,
            name: user.plan.name,
          },
        },
      };
    } catch (error) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }

  // ====================
  // Logout
  // ====================

  async logout(refreshToken: string): Promise<{ message: string }> {
    const hashedToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: hashedToken },
    });

    if (storedToken) {
      storedToken.isRevoked = true;
      storedToken.revokedAt = new Date();
      await this.refreshTokenRepository.save(storedToken);
    }

    return { message: "Logged out successfully" };
  }

  // ====================
  // Password Reset
  // ====================

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto
  ): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    // Don't reveal if user exists
    if (!user) {
      return {
        message: "If the email exists, a password reset link has been sent.",
      };
    }

    const resetToken = this.generateRandomToken();

    const passwordReset = this.passwordResetRepository.create({
      userId: user.id,
      email: user.email,
      token: resetToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    await this.passwordResetRepository.save(passwordReset);

    await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return {
      message: "If the email exists, a password reset link has been sent.",
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto
  ): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    const passwordReset = await this.passwordResetRepository.findOne({
      where: { token, isUsed: false },
    });

    if (!passwordReset) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    if (passwordReset.expiresAt < new Date()) {
      throw new BadRequestException("Reset token has expired");
    }

    const user = await this.userRepository.findOne({
      where: { id: passwordReset.userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Hash new password
    const { hash, salt } = await this.hashPassword(newPassword);

    user.passwordHash = hash;
    user.salt = salt;
    await this.userRepository.save(user);

    // Mark reset token as used
    passwordReset.isUsed = true;
    passwordReset.usedAt = new Date();
    await this.passwordResetRepository.save(passwordReset);

    // Revoke all refresh tokens for security
    await this.refreshTokenRepository.update(
      { userId: user.id, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() }
    );

    return { message: "Password reset successfully. Please log in." };
  }

  // ====================
  // Validate User (for strategies)
  // ====================

  async validateUser(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId, isActive: true },
      relations: ["plan"],
    });
  }
}
