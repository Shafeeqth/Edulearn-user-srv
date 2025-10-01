import { Cart } from "src/domain/entities/cart.entity";

export class CartDto {
  id: string;
  userId: string;
  courseId: string;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;

  static fromDomain(cart: Cart): CartDto {
    const dto = new CartDto();
    dto.id = cart.getId();
    dto.userId = cart.getUserId();
    dto.createdAt = cart.getCreatedAt();

    return dto;
  }
}
