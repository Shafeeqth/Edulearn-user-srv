import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryColumn,
  JoinColumn,
} from "typeorm";
import { UserOrmEntity } from "./user-orm-entity";

@Entity("user_socials")
export class UserSocialOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column("uuid")
  userId!: string;

  @ManyToOne(() => UserOrmEntity, (u) => u.socials, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: UserOrmEntity;

  @Index()
  @Column()
  provider!: string; // e.g., google, github 
  
//   @Index()
  @Column({ nullable: true })
  providerUserId?: string;

  @Column()
  profileUrl: string;

  // @Column({ nullable: true })
  // encryptedAccessToken?: string;

  // @Column({ nullable: true })
  // encryptedRefreshToken?: string;

//   @CreateDateColumn({ type: "timestamptz", nullable: true })
//   createdAt?: Date;
}
