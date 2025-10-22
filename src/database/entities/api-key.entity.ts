import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import { ApiKeyType } from "./enums";
import { Usage } from "./usage.entity";
import { User } from "./user.entity";

@Entity("api_keys")
@Index("idx_api_keys_hash", ["keyHash"], { unique: true })
@Index("idx_api_keys_user", ["userId"])
// @Index("idx_api_keys_project", ["projectId"])
export class ApiKey extends BaseEntity {
  @Column()
  keyHash: string; // Hashed version of the actual key for validation

  @Column({ nullable: true })
  encryptedKey: string; // Encrypted version of the actual key (optional, for recovery)

  @Column()
  keyPrefix: string; // For display: "pdf_live_...abc" or "pdf_test_...xyz"

  @Column()
  keyMask: string; // Masked version for display: "pdf_live_****...abc"

  @Column({
    type: "enum",
    enum: ApiKeyType,
    default: ApiKeyType.LIVE,
  })
  type: ApiKeyType;

  @Column({ nullable: true })
  name: string; // User-defined name for the key

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isRevoked: boolean; // Soft delete flag

  @Column({ type: "timestamp", nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: "timestamp", nullable: true })
  expiresAt: Date | null; // null = never expires

  @Column({ type: "timestamp", nullable: true })
  revokedAt: Date | null; // When the key was revoked

  // User relationship
  @ManyToOne(() => User, (user) => user.apiKeys, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column()
  @Index()
  userId: string;

  // Access control
  @Column({ type: "json", nullable: true })
  permissions: string[]; // Array of permission strings

  @Column({ type: "json", nullable: true })
  allowedDomains: string[]; // Optional domain whitelist

  // Security metadata
  @Column({ type: "json", nullable: true })
  securityMetadata: {
    userAgent?: string;
    rotationCount?: number;
    parentKeyId?: string; // For key rotation tracking
  };

  // General metadata
  @Column({ type: "json", nullable: true })
  metadata: Record<string, any>;

  // Relationships
  @OneToMany(() => Usage, (usage) => usage.apiKey)
  usageRecords: Usage[];
}
