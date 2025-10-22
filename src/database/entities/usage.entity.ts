import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { ApiKey } from "./api-key.entity";
import { BaseEntity } from "./base.entity";
import { UsageStatus } from "./enums";
import { User } from "./user.entity";

@Entity("usage")
@Index("idx_usage_user_created", ["userId", "createdAt"])
@Index("idx_usage_apikey_created", ["apiKeyId", "createdAt"])
@Index("idx_usage_date", ["date"])
export class Usage extends BaseEntity {
  // User and API Key references
  @ManyToOne(() => User, (user) => user.usageRecords, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => ApiKey, (apiKey) => apiKey.usageRecords, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "apiKeyId" })
  apiKey: ApiKey | null;

  @Column({ nullable: true })
  apiKeyId: string | null;

  // Request details
  @Column()
  endpoint: string;

  @Column()
  method: string;

  @Column({
    type: "enum",
    enum: UsageStatus,
    default: UsageStatus.SUCCESS,
  })
  status: UsageStatus;

  @Column({ type: "int", nullable: true })
  statusCode: number | null;

  // Processing metrics
  @Column({ type: "int", nullable: true })
  fileSizeBytes: number | null;

  @Column({ type: "int", nullable: true })
  pagesGenerated: number | null;

  @Column({ type: "int", nullable: true })
  processingTimeMs: number | null;

  // Date tracking (for quota enforcement)
  @Column({ type: "date" })
  date: string; // Format: YYYY-MM-DD

  // Additional data
  @Column({ type: "text", nullable: true })
  errorMessage: string | null;

  @Column({ type: "json", nullable: true })
  requestMetadata: Record<string, any>;

  @Column({ type: "json", nullable: true })
  responseMetadata: Record<string, any>;

  // IP address (optional)
  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress: string | null;

  // User agent (optional)
  @Column({ type: "text", nullable: true })
  userAgent: string | null;
}
