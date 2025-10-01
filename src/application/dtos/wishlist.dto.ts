import { Wishlist } from "src/domain/entities/wishlist.entity";

export class WishlistDto {
  id: string;
  userId: string;
  courseId: string;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;

  static fromDomain(wishlist: Wishlist): WishlistDto {
    const dto = new WishlistDto();
    dto.id = wishlist.getId();
    dto.userId = wishlist.getUserId();
    dto.createdAt = wishlist.getCreatedAt();

    return dto;
  }
}
