import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "./base.entity";

@Entity("email_verifications")
@Index("idx_email_verifications_email", ["email"])
@Index("idx_email_verifications_token", ["token"], { unique: true })
export class EmailVerification extends BaseEntity {
  @Column()
  email: string;

  @Column()
  token: string;

  @Column({ type: "timestamp" })
  expiresAt: Date;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ type: "timestamp", nullable: true })
  verifiedAt: Date | null;

  @Column({ type: "varchar", length: 36, nullable: true })
  userId: string | null; // null if user hasn't completed signup yet
}
