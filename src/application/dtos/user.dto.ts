import { Cart } from "src/domain/entities/cart.entity";
import { Wishlist } from "src/domain/entities/wishlist.entity";
import User, { UserRoles, UserStatus } from "src/domain/entities/_user.entity";
import { WishlistDto } from "./wishlist.dto";
import { CartDto } from "./cart.dto";

export class UserDto {
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  
  id: string;
  email: string;
  role: UserRoles;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  phone?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  language?: string;
  website?: string;
  biography?: string;
  headline?: string;
  wishlist: WishlistDto[];
  cart: CartDto[];

  static fromDomain(
    user: User & { wishlist: Wishlist[]; cart: Cart[] }
  ): UserDto {
    const dto = new UserDto();
    dto.status = user.getStatus();
    dto.createdAt = user.getCreatedAt();
    dto.updatedAt = user.getUpdatedAt();
    dto.id = user.getId();
    dto.email = user.getEmail();
    dto.role = user.getRole();
    dto.firstName = user.getFirstName();
    dto.lastName = user.getLastName();
    dto.avatar = user.getAvatar();
    dto.phone = user.getPhone();
    dto.linkedin = user.getLinkedin();
    dto.instagram = user.getInstagram();
    dto.facebook = user.getFacebook();
    dto.language = user.getLanguage();
    dto.website = user.getWebsite();
    dto.biography = user.getBio();
    dto.headline = user.getHeadline();
    dto.wishlist = user.wishlist.map(WishlistDto.fromDomain);
    dto.cart = user.cart.map(CartDto.fromDomain);

    return dto;
  }
}
