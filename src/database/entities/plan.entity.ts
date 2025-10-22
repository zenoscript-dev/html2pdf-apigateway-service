import { Column, Entity, Index, OneToMany } from "typeorm";
import { BaseEntity } from "./base.entity";
import { User } from "./user.entity";

@Entity("plans")
@Index("idx_plans_name", ["name"], { unique: true })
export class Plan extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ default: true })
  isActive: boolean;

  // Request Limits
  @Column({ type: "int", nullable: true })
  dailyRequestLimit: number | null; // null = unlimited

  @Column({ type: "int", nullable: true })
  monthlyRequestLimit: number | null; // null = unlimited

  // File Limits
  @Column({ type: "int", default: 5 })
  maxFileSizeMB: number;

  @Column({ type: "int", nullable: true })
  maxPagesPerPdf: number | null; // null = unlimited

  // Processing Limits
  @Column({ type: "int", default: 1 })
  maxConcurrentJobs: number;

  // Features
  @Column({ default: false })
  webhooksEnabled: boolean;

  @Column({ default: false })
  priorityProcessing: boolean;

  @Column({ default: false })
  customWatermark: boolean;

  @Column({ default: false })
  apiAccess: boolean;

  @Column({ default: true })
  sandboxEnabled: boolean;

  // Additional Features (JSON for flexibility)
  @Column({ type: "json", nullable: true })
  features: Record<string, any>;

  // Metadata
  @Column({ type: "json", nullable: true })
  metadata: Record<string, any>;

  // Relationships
  @OneToMany(() => User, (user) => user.plan)
  users: User[];
}
