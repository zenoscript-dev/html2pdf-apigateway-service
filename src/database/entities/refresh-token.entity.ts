import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { User } from "./user.entity";

@Entity("refresh_tokens")
@Index("idx_refresh_tokens_token", ["token"], { unique: true })
@Index("idx_refresh_tokens_user", ["userId"])
export class RefreshToken extends BaseEntity {
  @Column()
  token: string; // Hashed refresh token

  @Column({ type: "timestamp" })
  expiresAt: Date;

  @Column({ default: false })
  isRevoked: boolean;

  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ type: "text", nullable: true })
  userAgent: string | null;

  // User relationship
  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column()
  @Index()
  userId: string;

  // Replaced by (for token rotation)
  @Column({ type: "text", nullable: true })
  replacedByToken: string | null;

  @Column({ type: "timestamp", nullable: true })
  revokedAt: Date | null;
}
