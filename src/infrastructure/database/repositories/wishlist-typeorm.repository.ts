import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RedisService } from "../../redis/redis.service";
import { LoggingService } from "src/infrastructure/observability/logging/logging.service";
import { TracingService } from "src/infrastructure/observability/tracing/trace.service";
import { MetricsService } from "src/infrastructure/observability/metrics/metrics.service";
import { Wishlist } from "src/domain/entities/wishlist.entity";
import { WishlistItem } from "src/domain/entities/wishlist-item.entity";
import { WishlistOrmEntity } from "../entities/wishlist.orm-entity";
import { WishlistItemOrmEntity } from "../entities/wishlist-item.orm-entity";
import { WishlistRepository } from "src/domain/repositories/wishlist.repository";

@Injectable()
export class WishlistTypeOrmRepository implements WishlistRepository {
  constructor(
    @InjectRepository(WishlistOrmEntity)
    private readonly repo: Repository<WishlistOrmEntity>,
    @InjectRepository(WishlistItemOrmEntity)
    private readonly wishlistItemRepo: Repository<WishlistItemOrmEntity>,
    private readonly logger: LoggingService,
    private readonly tracer: TracingService,
    private readonly metrics: MetricsService
  ) {}

  async create(wishlist: Wishlist): Promise<void> {
    return await this.tracer.startActiveSpan(
      "WishlistTypeOrmRepository.create",
      async (span) => {
        span.setAttributes({
          "db.operation": "INSERT",
          "wishlist.id": wishlist.getId(),
        });
        const ormEntity = this.toOrmEntity(wishlist);

        this.metrics.incrementDBRequestCounter("INSERT");
        // Measure DB operation delay
        const end = this.metrics.measureDBOperationDuration(
          "wishlist.create",
          "INSERT"
        );
        await this.repo.save(ormEntity);

        // Save wishlist items if they exist
        if (wishlist.getItems().length > 0) {
          const wishlistItemEntities = wishlist
            .getItems()
            .map((item) => this.toWishlistItemOrmEntity(item));
          await this.wishlistItemRepo.save(wishlistItemEntities);
        }

        end();
      }
    );
  }

  async findById(id: string): Promise<Wishlist | null> {
    return await this.tracer.startActiveSpan(
      "WishlistTypeOrmRepository.findById",
      async (span) => {
        span.setAttributes({
          "db.operation": "SELECT",
          "wishlist.id": id,
        });

        this.metrics.incrementDBRequestCounter("SELECT");
        // Measure DB operation delay
        const end = this.metrics.measureDBOperationDuration(
          "wishlist.findById",
          "SELECT"
        );
        const ormEntity = await this.repo.findOne({
          where: { id },
          relations: ["items"],
        });
        end();

        if (!ormEntity) {
          span.setAttribute("wishlist.db.found", false);
          return null;
        }

        span.setAttribute("wishlist.db.found", true);
        const wishlist = this.toDomainEntity(ormEntity);
        return wishlist;
      }
    );
  }
  async findItemByUserIdAndCourseId(
    userId: string,
    courseId: string
  ): Promise<WishlistItem | null> {
    return await this.tracer.startActiveSpan(
      "WishlistTypeOrmRepository.findItemByUserIdAndCourseId",
      async (span) => {
        span.setAttributes({
          "db.operation": "SELECT",
          "wishlist.userId": userId,
          "wishlist.courseId": courseId,
        });

        // Find wishlist by userId first
        const result = await this.findByUserId(userId);
        if (!result.wishlist) {
          span.setAttribute("wishlist.db.found", false);
          return null;
        }

        // Check if the wishlist contains the specific course
        const wishlistItem = result.wishlist
          .getItems()
          .find((item) => item.getCourseId() === courseId);

        if (!wishlistItem) {
          span.setAttribute("wishlist.db.found", false);
          return null;
        }

        span.setAttribute("wishlist.db.found", true);
        return wishlistItem;
      }
    );
  }

  async findByUserId(
    userId: string,
    offset?: number,
    limit?: number
  ): Promise<{ wishlist: Wishlist | null; totalItems: number }> {
    return await this.tracer.startActiveSpan(
      "WishlistTypeOrmRepository.findByUserId",
      async (span) => {
        span.setAttributes({
          "db.operation": "SELECT",
          "user.id": userId,
        });
        this.metrics.incrementDBRequestCounter("SELECT");
        // Measure DB operation delay
        const end = this.metrics.measureDBOperationDuration(
          "wishlist.findByCourseId",
          "SELECT"
        );
        // First, get the wishlist without items to check if it exists
        const wishlistEntity = await this.repo.findOne({
          where: { userId },
        });

        if (!wishlistEntity) {
          span.setAttribute("wishlist.db.found", false);
          return { wishlist: null, totalItems: 0 };
        }

        // Get total count of items
        const totalItems = await this.wishlistItemRepo.count({
          where: { wishlistId: wishlistEntity.id },
        });

        // Get paginated items
        const items = await this.wishlistItemRepo.find({
          where: { wishlistId: wishlistEntity.id },
          skip: offset || 0,
          take: limit || 10,
          order: { addedAt: "DESC" },
        });

        // Create wishlist entity with paginated items
        const wishlistWithItems = {
          ...wishlistEntity,
          items: items,
        };

        end();

        span.setAttribute("wishlist.db.found", true);
        const wishlist = this.toDomainEntity(wishlistWithItems);

        return { wishlist, totalItems };
      }
    );
  }

  async delete(wishlist: Wishlist): Promise<void> {
    return await this.tracer.startActiveSpan(
      "WishlistTypeOrmRepository.delete",
      async (span) => {
        span.setAttributes({
          "db.operation": "DELETE",
          "wishlist.id": wishlist.getId(),
        });

        this.metrics.incrementDBRequestCounter("DELETE");
        // Measure DB operation delay
        const end = this.metrics.measureDBOperationDuration(
          "wishlist.delete",
          "DELETE"
        );
        // Delete wishlist items first
        await this.wishlistItemRepo.delete({ wishlistId: wishlist.getId() });
        // Then delete the wishlist
        await this.repo.delete(wishlist.getId());
        end();
      }
    );
  }

  async update(wishlist: Wishlist): Promise<void> {
    return await this.tracer.startActiveSpan(
      "WishlistTypeOrmRepository.update",
      async (span) => {
        span.setAttributes({
          "db.operation": "UPDATE",
          "wishlist.id": wishlist.getId(),
        });

        this.metrics.incrementDBRequestCounter("UPDATE");
        const end = this.metrics.measureDBOperationDuration(
          "wishlist.update",
          "UPDATE"
        );

        // Update wishlist
        const ormEntity = this.toOrmEntity(wishlist);
        await this.repo.save(ormEntity);

        // Update wishlist items
        if (wishlist.getItems().length > 0) {
          // Delete existing items
          await this.wishlistItemRepo.delete({ wishlistId: wishlist.getId() });
          // Insert new items
          const wishlistItemEntities = wishlist
            .getItems()
            .map((item) => this.toWishlistItemOrmEntity(item));
          await this.wishlistItemRepo.save(wishlistItemEntities);
        }

        end();

        this.logger.debug(`Updated wishlist ${wishlist.getId()}`, {
          ctx: WishlistTypeOrmRepository.name,
        });
      }
    );
  }

  async addItem(wishlistItem: WishlistItem): Promise<void> {
    return await this.tracer.startActiveSpan(
      "WishlistTypeOrmRepository.addItem",
      async (span) => {
        span.setAttributes({
          "db.operation": "INSERT",
          "wishlist.id": wishlistItem.getWishlistId(),
          "course.id": wishlistItem.getCourseId(),
        });

        // Check if item already exists
        // const existingItem = await this.wishlistItemRepo.findOne({
        //   where: {
        //     wishlistId: wishlistItem.getWishlistId(),
        //     courseId: wishlistItem.getCourseId(),
        //   },
        // });

        // if (existingItem) {
        //   this.logger.debug(
        //     `Item ${wishlistItem.getCourseId()} already exists in wishlist ${wishlistItem.getWishlistId()}`
        //   );
        //   return;
        // }

        // Create new wishlist item
        const wishlistItemOrm = this.toWishlistItemOrmEntity(wishlistItem);

        this.metrics.incrementDBRequestCounter("INSERT");
        const end = this.metrics.measureDBOperationDuration(
          "wishlist.addItem",
          "INSERT"
        );

        await this.wishlistItemRepo.save(wishlistItemOrm);
        end();

        this.logger.debug(
          `Added item ${wishlistItem.getCourseId()} to wishlist ${wishlistItem.getWishlistId()}`,
          {
            ctx: WishlistTypeOrmRepository.name,
          }
        );
      }
    );
  }

  async removeItem(wishlistId: string, courseId: string): Promise<void> {
    return await this.tracer.startActiveSpan(
      "WishlistTypeOrmRepository.removeItem",
      async (span) => {
        span.setAttributes({
          "db.operation": "DELETE",
          "wishlist.id": wishlistId,
          "course.id": courseId,
        });

        this.metrics.incrementDBRequestCounter("DELETE");
        const end = this.metrics.measureDBOperationDuration(
          "wishlist.removeItem",
          "DELETE"
        );

        await this.wishlistItemRepo.delete({ wishlistId, courseId });
        end();

        this.logger.debug(
          `Removed item ${courseId} from wishlist ${wishlistId}`,
          {
            ctx: WishlistTypeOrmRepository.name,
          }
        );
      }
    );
  }

  private toOrmEntity(wishlist: Wishlist): WishlistOrmEntity {
    const ormEntity = new WishlistOrmEntity();
    ormEntity.id = wishlist.getId();
    ormEntity.userId = wishlist.getUserId();
    ormEntity.total = wishlist.getTotal();
    ormEntity.createdAt = wishlist.getCreatedAt();
    ormEntity.updatedAt = wishlist.getUpdatedAt();

    return ormEntity;
  }

  private toWishlistItemOrmEntity(
    wishlistItem: WishlistItem
  ): WishlistItemOrmEntity {
    const ormEntity = new WishlistItemOrmEntity();
    ormEntity.id = wishlistItem.getId();
    ormEntity.courseId = wishlistItem.getCourseId();
    ormEntity.wishlistId = wishlistItem.getWishlistId();
    ormEntity.addedAt = wishlistItem.getAddedAt();

    return ormEntity;
  }

  private toDomainEntity(ormEntity: WishlistOrmEntity): Wishlist {
    const wishlistItems = ormEntity.items
      ? ormEntity.items.map(
          (item) =>
            new WishlistItem(
              item.id,
              item.courseId,
              item.wishlistId,
              item.addedAt
            )
        )
      : [];

    return new Wishlist(
      ormEntity.id,
      ormEntity.userId,
      wishlistItems,
      ormEntity.total,
      ormEntity.createdAt,
      ormEntity.updatedAt
    );
  }
}
