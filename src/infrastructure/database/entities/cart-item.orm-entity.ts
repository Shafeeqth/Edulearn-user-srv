import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { CartOrmEntity } from "./cart.orm-entity";

@Entity("cart_items")
export class CartItemOrmEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  courseId: string;

  @Column()
  cartId: string;

  @ManyToOne(() => CartOrmEntity, (cart) => cart.items)
  @JoinColumn({ name: "cartId" })
  cart: CartOrmEntity;

  @CreateDateColumn()
  addedAt: Date;
}
