import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { WishlistOrmEntity } from "./wishlist.orm-entity";

@Entity("wishlist_items")
export class WishlistItemOrmEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  courseId: string;

  @Column()
  wishlistId: string;

  @ManyToOne(() => WishlistOrmEntity, (wishlist) => wishlist.items)
  @JoinColumn({ name: "wishlistId" })
  wishlist: WishlistOrmEntity;

  @CreateDateColumn()
  addedAt: Date;
}
