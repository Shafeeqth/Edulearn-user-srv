
export class WishlistItem {
  constructor(
    private readonly id: string,
    private readonly courseId: string,
    private readonly wishlistId: string,
    private readonly addedAt: Date = new Date()
  ) {}

  // Getters
  getId(): string {
    return this.id;
  }
  
  getCourseId(): string {
    return this.courseId;
  }
  
  getWishlistId(): string {
    return this.wishlistId;
  }
  
  getAddedAt(): Date {
    return this.addedAt;
  }
}
