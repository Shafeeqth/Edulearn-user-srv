import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RedisService } from "../../redis/redis.service";
import { LoggingService } from "src/infrastructure/observability/logging/logging.service";
import { TracingService } from "src/infrastructure/observability/tracing/trace.service";
import { MetricsService } from "src/infrastructure/observability/metrics/metrics.service";

import { CartRepository } from "src/domain/repositories/cart.repository";
import { CartOrmEntity } from "../entities/cart.orm-entity";
import { CartItemOrmEntity } from "../entities/cart-item.orm-entity";
import { Cart } from "src/domain/entities/cart.entity";
import { CartItem } from "src/domain/entities/cart-item.entity";

@Injectable()
export class CartTypeOrmRepository implements CartRepository {
  constructor(
    @InjectRepository(CartOrmEntity)
    private readonly repo: Repository<CartOrmEntity>,
    @InjectRepository(CartItemOrmEntity)
    private readonly cartItemRepo: Repository<CartItemOrmEntity>,
    private readonly logger: LoggingService,
    private readonly tracer: TracingService,
    private readonly metrics: MetricsService
  ) {}

  async create(cart: Cart): Promise<void> {
    return await this.tracer.startActiveSpan(
      "CartTypeOrmRepository.create",
      async (span) => {
        span.setAttributes({
          "db.operation": "INSERT",
          "cart.id": cart.getId(),
        });
        const ormEntity = this.toOrmEntity(cart);

        this.metrics.incrementDBRequestCounter("INSERT");
        // Measure DB operation delay
        const end = this.metrics.measureDBOperationDuration(
          "cart.create",
          "INSERT"
        );
        await this.repo.save(ormEntity);

        // Save cart items if they exist
        if (cart.getItems().length > 0) {
          const cartItemEntities = cart
            .getItems()
            .map((item) => this.toCartItemOrmEntity(item));
          await this.cartItemRepo.save(cartItemEntities);
        }

        end();
      }
    );
  }

  async findById(id: string): Promise<Cart | null> {
    return await this.tracer.startActiveSpan(
      "CartTypeOrmRepository.findById",
      async (span) => {
        span.setAttributes({
          "db.operation": "SELECT",
          "cart.id": id,
        });

        this.metrics.incrementDBRequestCounter("SELECT");
        // Measure DB operation delay
        const end = this.metrics.measureDBOperationDuration(
          "cart.findById",
          "SELECT"
        );
        const ormEntity = await this.repo.findOne({
          where: { id },
          relations: ["items"],
        });
        end();

        if (!ormEntity) {
          span.setAttribute("cart.db.found", false);
          return null;
        }

        span.setAttribute("cart.db.found", true);
        const cart = this.toDomainEntity(ormEntity);

        return cart;
      }
    );
  }

  async findItemByUserIdAndCourseId(
    userId: string,
    courseId: string
  ): Promise<CartItem | null> {
    return await this.tracer.startActiveSpan(
      "CartTypeOrmRepository.findItemByUserIdAndCourseId",
      async (span) => {
        span.setAttributes({
          "db.operation": "SELECT",
          "cart.userId": userId,
          "cart.courseId": courseId,
        });

        // Find cart by userId first
        const result = await this.findByUserId(userId);
        if (!result.cart) {
          span.setAttribute("cart.db.found", false);
          return null;
        }

        // Check if the cart contains the specific course
        const courseItem = result.cart
          .getItems()
          .find((item) => item.getCourseId() === courseId);

        if (!courseItem) {
          span.setAttribute("cart.db.found", false);
          return null;
        }

        span.setAttribute("cart.db.found", true);
        return courseItem;
      }
    );
  }

  async findByUserId(
    userId: string,
    offset?: number,
    limit?: number
  ): Promise<{ cart: Cart | null; totalItems: number }> {
    return await this.tracer.startActiveSpan(
      "CartTypeOrmRepository.findByUserId",
      async (span) => {
        span.setAttributes({
          "db.operation": "SELECT",
          "user.id": userId,
        });
        this.metrics.incrementDBRequestCounter("SELECT");
        // Measure DB operation delay
        const end = this.metrics.measureDBOperationDuration(
          "cart.findByCourseId",
          "SELECT"
        );
        // First, get the cart without items to check if it exists
        const cartEntity = await this.repo.findOne({
          where: { userId },
        });

        if (!cartEntity) {
          span.setAttribute("cart.db.found", false);
          return { cart: null, totalItems: 0 };
        }

        // Get total count of items
        const totalItems = await this.cartItemRepo.count({
          where: { cartId: cartEntity.id },
        });

        // Get paginated items
        const items = await this.cartItemRepo.find({
          where: { cartId: cartEntity.id },
          skip: offset || 0,
          take: limit || 10,
          order: { addedAt: "DESC" },
        });

        // Create cart entity with paginated items
        const cartWithItems = {
          ...cartEntity,
          items: items,
        };

        end();

        span.setAttribute("cart.db.found", true);
        const cart = this.toDomainEntity(cartWithItems);

        return { cart, totalItems };
      }
    );
  }

  async delete(cart: Cart): Promise<void> {
    return await this.tracer.startActiveSpan(
      "CartTypeOrmRepository.delete",
      async (span) => {
        span.setAttributes({
          "db.operation": "DELETE",
          "cart.id": cart.getId(),
        });

        this.metrics.incrementDBRequestCounter("DELETE");
        // Measure DB operation delay
        const end = this.metrics.measureDBOperationDuration(
          "cart.delete",
          "DELETE"
        );
        // Delete cart items first
        await this.cartItemRepo.delete({ cartId: cart.getId() });
        // Then delete the cart
        await this.repo.delete(cart.getId());
        end();

      }
    );
  }

  async update(cart: Cart): Promise<void> {
    return await this.tracer.startActiveSpan(
      "CartTypeOrmRepository.update",
      async (span) => {
        span.setAttributes({
          "db.operation": "UPDATE",
          "cart.id": cart.getId(),
        });

        this.metrics.incrementDBRequestCounter("UPDATE");
        const end = this.metrics.measureDBOperationDuration(
          "cart.update",
          "UPDATE"
        );

        // Update cart
        const ormEntity = this.toOrmEntity(cart);
        await this.repo.save(ormEntity);

        // Update cart items
        if (cart.getItems().length > 0) {
          // Delete existing items
          await this.cartItemRepo.delete({ cartId: cart.getId() });
          // Insert new items
          const cartItemEntities = cart
            .getItems()
            .map((item) => this.toCartItemOrmEntity(item));
          await this.cartItemRepo.save(cartItemEntities);
        }

        end();


        this.logger.debug(`Updated cart ${cart.getId()}`, {
          ctx: CartTypeOrmRepository.name,
        });
      }
    );
  }

  async addItem(cartItem: CartItem): Promise<void> {
    return await this.tracer.startActiveSpan(
      "CartTypeOrmRepository.addItem",
      async (span) => {
        span.setAttributes({
          "db.operation": "INSERT",
          "cart.id": cartItem.getCartId(),
          "course.id": cartItem.getCourseId(),
        });

        // // Check if item already exists
        // const existingItem = await this.cartItemRepo.findOne({
        //   where: {
        //     cartId: cartItem.getCartId(),
        //     courseId: cartItem.getCourseId(),
        //   },
        // });

        // if (existingItem) {
        //   this.logger.debug(
        //     `Item ${cartItem.getCourseId()} already exists in cart ${cartItem.getCartId()}`
        //   );
        //   return;
        // }

        // Create new cart item

        const cartItemOrm = this.toCartItemOrmEntity(cartItem);

        this.metrics.incrementDBRequestCounter("INSERT");
        const end = this.metrics.measureDBOperationDuration(
          "cart.addItem",
          "INSERT"
        );

        await this.cartItemRepo.save(cartItemOrm);
        end();

        this.logger.debug(
          `Added item ${cartItem.getCourseId()} to cart ${cartItem.getCartId()}`,
          {
            ctx: CartTypeOrmRepository.name,
          }
        );
      }
    );
  }

  async removeItem(cartId: string, courseId: string): Promise<void> {
    return await this.tracer.startActiveSpan(
      "CartTypeOrmRepository.removeItem",
      async (span) => {
        span.setAttributes({
          "db.operation": "DELETE",
          "cart.id": cartId,
          "course.id": courseId,
        });

        this.metrics.incrementDBRequestCounter("DELETE");
        const end = this.metrics.measureDBOperationDuration(
          "cart.removeItem",
          "DELETE"
        );

        await this.cartItemRepo.delete({ cartId, courseId });
        end();


        this.logger.debug(`Removed item ${courseId} from cart ${cartId}`, {
          ctx: CartTypeOrmRepository.name,
        });
      }
    );
  }

  private toOrmEntity(cart: Cart): CartOrmEntity {
    const ormEntity = new CartOrmEntity();
    ormEntity.id = cart.getId();
    ormEntity.userId = cart.getUserId();
    ormEntity.total = cart.getTotal();
    ormEntity.createdAt = cart.getCreatedAt();
    ormEntity.updatedAt = cart.getUpdatedAt();

    return ormEntity;
  }

  private toCartItemOrmEntity(cartItem: CartItem): CartItemOrmEntity {
    const ormEntity = new CartItemOrmEntity();
    ormEntity.id = cartItem.getId();
    ormEntity.courseId = cartItem.getCourseId();
    ormEntity.cartId = cartItem.getCartId();
    ormEntity.addedAt = cartItem.getAddedAt();

    return ormEntity;
  }

  private toDomainEntity(ormEntity: CartOrmEntity): Cart {
    const cartItems = ormEntity.items
      ? ormEntity.items.map(
          (item) =>
            new CartItem(item.id, item.courseId, item.cartId, item.addedAt)
        )
      : [];

    return new Cart(
      ormEntity.id,
      ormEntity.userId,
      cartItems,
      ormEntity.total,
      ormEntity.createdAt,
      ormEntity.updatedAt
    );
  }
}
