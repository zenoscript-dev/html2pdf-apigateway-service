import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { ApiKey } from "./api-key.entity";
import { BaseEntity } from "./base.entity";
import { UserRole } from "./enums";
import { Plan } from "./plan.entity";
import { RefreshToken } from "./refresh-token.entity";
import { Usage } from "./usage.entity";

@Entity("users")
@Index("idx_users_email", ["email"], { unique: true })
@Index("idx_users_plan", ["planId"])
export class User extends BaseEntity {
  @Column()
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  salt: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: "timestamp", nullable: true })
  lastLoginAt: Date | null;

  // Plan relationship
  @ManyToOne(() => Plan, (plan) => plan.users, { eager: true })
  @JoinColumn({ name: "planId" })
  plan: Plan;

  @Column()
  planId: string;

  // Metadata
  @Column({ type: "json", nullable: true })
  metadata: Record<string, any>;

  // Relationships
  @OneToMany(() => ApiKey, (apiKey) => apiKey.user)
  apiKeys: ApiKey[];

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => Usage, (usage) => usage.user)
  usageRecords: Usage[];
}
