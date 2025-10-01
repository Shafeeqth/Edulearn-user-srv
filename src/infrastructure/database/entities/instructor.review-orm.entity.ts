import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import { InstructorProfileOrmEntity } from "./instructor-profile-orm.entity";
import { UserOrmEntity } from "./user-orm-entity";

@Entity("instructor_reviews")
export class InstructorReviewOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @ManyToOne(() => InstructorProfileOrmEntity, (i) => i.reviews, {
    onDelete: "CASCADE",
  })
  instructor!: InstructorProfileOrmEntity;

  @ManyToOne(() => UserOrmEntity, { onDelete: "SET NULL", nullable: true })
  student?: UserOrmEntity;

  @Column({ type: "int" })
  rating!: number;

  @Column({ type: "text", nullable: true })
  reviewText?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
