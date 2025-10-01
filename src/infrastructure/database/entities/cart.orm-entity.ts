import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
  OneToMany,
} from "typeorm";
import { UserOrmEntity } from "./user-orm-entity";
import { CartItemOrmEntity } from "./cart-item.orm-entity";

@Entity("carts")
export class CartOrmEntity {
  @PrimaryColumn()
  id: string;

  @Index("idx_cart_userId")
  @Column()
  userId: string;

  @OneToOne(() => UserOrmEntity, (user) => user.cart)
  @JoinColumn({ name: "userId" })
  @Index("idx_cart_user_id") // Index for joining with sections
  user: UserOrmEntity;

  @OneToMany(() => CartItemOrmEntity, (cartItem) => cartItem.cart)
  items: CartItemOrmEntity[];

  @Column({ type: "int", default: 0 })
  total: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
