import { Column, Entity, OneToOne, PrimaryColumn, CreateDateColumn, JoinColumn } from "typeorm";
import { UserOrmEntity } from "./user-orm-entity";

@Entity("user_profiles")
export class UserProfileOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;
  
  @Column({ nullable: false })
  userId: string;
  

  @OneToOne(() => UserOrmEntity, (u) => u.profile)
  @JoinColumn({ name: "userId" })
  user!: UserOrmEntity;

  @Column({ type: "text", nullable: true })
  bio?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  country?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  city?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  language?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  website?: string;  

  @Column({ type: "enum", enum: ["male", "female", "other"], nullable: true })
  gender?: "male" | "female" | "other";

  @Column({ type: "jsonb", nullable: true })
  preferences?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date


}
