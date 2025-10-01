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
import { WishlistItemOrmEntity } from "./wishlist-item.orm-entity";

@Entity("wishlists")
export class WishlistOrmEntity {
  @PrimaryColumn()
  id: string;

  @Index("idx_wishlist_userId")
  @Column()
  userId: string;

  @OneToOne(() => UserOrmEntity, (user) => user.wishlist)
  @JoinColumn({ name: "userId" })
  @Index("idx_wishlist_user_id") // Index for joining with sections
  user: UserOrmEntity;

  @OneToMany(() => WishlistItemOrmEntity, (wishlistItem) => wishlistItem.wishlist)
  items: WishlistItemOrmEntity[];

  @Column({ type: "int", default: 0 })
  total: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
