import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "./base.entity";

@Entity("password_resets")
@Index("idx_password_resets_user", ["userId"])
@Index("idx_password_resets_email", ["email"])
@Index("idx_password_resets_token", ["token"], { unique: true })
export class PasswordReset extends BaseEntity {
  @Column()
  userId: string;

  @Column()
  email: string;

  @Column()
  token: string;

  @Column({ type: "timestamp" })
  expiresAt: Date;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ type: "timestamp", nullable: true })
  usedAt: Date | null;

  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress: string | null;
}
