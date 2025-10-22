import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Ip,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { User } from "../database/entities";
import { AuthService } from "./auth.service";
import { CurrentUser, Public } from "./decorators";
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  ResetPasswordDto,
  SignupDto,
  VerifyEmailDto,
} from "./dto";
import { JwtAuthGuard } from "./guards";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("signup")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({
    status: 201,
    description: "User registered successfully",
  })
  @ApiResponse({
    status: 409,
    description: "User already exists",
  })
  async signup(@Body() signupDto: SignupDto) {
    try {
      return await this.authService.signup(signupDto);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to create user account",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Public()
  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify email address" })
  @ApiResponse({
    status: 200,
    description: "Email verified successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid or expired token",
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    try {
      return await this.authService.verifyEmail(verifyEmailDto.token);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to verify email address",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Public()
  @Get("verify-email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify email via query param (for email links)" })
  async verifyEmailViaLink(@Query("token") token: string) {
    try {
      return await this.authService.verifyEmail(token);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to verify email address",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with email and password" })
  @ApiResponse({
    status: 200,
    description: "Login successful",
  })
  @ApiResponse({
    status: 401,
    description: "Invalid credentials",
  })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string
  ) {
    try {
      return await this.authService.login(loginDto, ipAddress, userAgent);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to authenticate user",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token using refresh token" })
  @ApiResponse({
    status: 200,
    description: "Token refreshed successfully",
  })
  @ApiResponse({
    status: 401,
    description: "Invalid or expired refresh token",
  })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string
  ) {
    try {
      return await this.authService.refreshTokens(
        refreshTokenDto.refreshToken,
        ipAddress,
        userAgent
      );
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to refresh authentication token",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout and revoke refresh token" })
  @ApiResponse({
    status: 200,
    description: "Logged out successfully",
  })
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    try {
      return await this.authService.logout(refreshTokenDto.refreshToken);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to logout user",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request password reset email" })
  @ApiResponse({
    status: 200,
    description: "If the email exists, a password reset link has been sent",
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    try {
      return await this.authService.forgotPassword(forgotPasswordDto);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to process password reset request",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset password with token" })
  @ApiResponse({
    status: 200,
    description: "Password reset successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid or expired token",
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    try {
      return await this.authService.resetPassword(resetPasswordDto);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to reset password",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Get current user profile (requires JWT)
  @UseGuards(JwtAuthGuard)
  @Get("profile")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({
    status: 200,
    description: "User profile retrieved successfully",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - invalid or missing JWT token",
  })
  async getProfile(@CurrentUser() user: User) {
    try {
      // Remove sensitive data
      const { passwordHash, ...userProfile } = user;
      return userProfile;
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to retrieve user profile",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
