import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({
    example: "abc123xyz...",
    description: "Password reset token",
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: "NewSecurePassword123!",
    description: "New password (minimum 8 characters)",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  newPassword: string;
}
