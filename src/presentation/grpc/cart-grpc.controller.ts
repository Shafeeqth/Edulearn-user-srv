import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { LoggingService } from "src/infrastructure/observability/logging/logging.service";
import { TracingService } from "src/infrastructure/observability/tracing/trace.service";
import { DomainException } from "src/domain/exceptions/domain.exceptions";
import {
  Error,
  PaginationResponse,
  AddToCartRequest,
  AddToCartResponse,
  RemoveFromCartRequest,
  RemoveFromCartResponse,
  CartData,
  CartItemData,
  ListCartRequest,
  ListCartResponse,
  ToggleCartItemRequest,
  ToggleCartItemResponse,
} from "src/infrastructure/grpc/generated/user_service";
import { AddToCartUseCase } from "src/application/use-cases/cart/add-to-cart.use-case";
import { RemoveFromCartUseCase } from "src/application/use-cases/cart/remove-cart.use-case";
import { GetCartByUserUseCase } from "src/application/use-cases/cart/get-cart-by-user.use-case";
import { Cart } from "src/domain/entities/cart.entity";
import { CartItem } from "src/domain/entities/cart-item.entity";
import { ToggleCartUseCase } from "src/application/use-cases/cart/toggle-cart.use-case";

@Controller()
export class CartGrpcController {
  constructor(
    private readonly addToCartUseCase: AddToCartUseCase,
    private readonly removeFromCartUseCase: RemoveFromCartUseCase,
    private readonly toggleCartItemUseCase: ToggleCartUseCase,
    private readonly getCartByUserUseCase: GetCartByUserUseCase,

    private readonly tracer: TracingService,
    private readonly logger: LoggingService
  ) {}

  private createErrorResponse(error: DomainException): Error {
    return {
      code: error.errorCode,
      message: error.message,
      details: error?.serializeError(),
    };
  }

  @GrpcMethod("UserService", "AddToCart")
  async addToCart(data: AddToCartRequest): Promise<AddToCartResponse> {
    try {
      return await this.tracer.startActiveSpan(
        "CartGrpcController.addToCart",
        async (span) => {
          const { courseId, userId, cartId } = data!;

          span.setAttributes({ courseId, userId });
          this.logger.info("Handling `AddToCart` request ", {
            ctx: CartGrpcController.name,
          });

          const cartItem = await this.addToCartUseCase.execute(
            cartId,
            userId,
            courseId
          );

          this.logger.info("AddToCart request has been successfully completed");

          return {
            item: this.mapToCartItemResponse(cartItem),
          };
        }
      );
    } catch (error) {
      this.logger.error("Error processing gRPC request `AddToCart`", {
        error,
      });
      return { error: this.createErrorResponse(error) };
    }
  }

  @GrpcMethod("UserService", "ToggleCartItem")
  async toggleCart(data: ToggleCartItemRequest): Promise<ToggleCartItemResponse> {
    try {
      return await this.tracer.startActiveSpan(
        "CartGrpcController.ToggleCartItem",
        async (span) => {
          const { courseId, userId, cartId } = data!;

          span.setAttributes({ courseId, userId });
          this.logger.info("Handling `ToggleCartItem` request ", {
            ctx: CartGrpcController.name,
          });

          const cartItem = await this.toggleCartItemUseCase.execute(
            cartId,
            userId,
            courseId
          );

          this.logger.info("ToggleCartItem request has been successfully completed");

          return {
            item: this.mapToCartItemResponse(cartItem),
          };
        }
      );
    } catch (error) {
      this.logger.error("Error processing gRPC request `AddToCart`", {
        error,
      });
      return { error: this.createErrorResponse(error) };
    }
  }
  @GrpcMethod("UserService", "RemoveFromCart")
  async removeFromCart(
    data: RemoveFromCartRequest
  ): Promise<RemoveFromCartResponse> {
    try {
      return await this.tracer.startActiveSpan(
        "CartGrpcController.removeFromCart",
        async (span) => {
          const { courseId, cartId } = data!;

          span.setAttributes({ courseId, cartId });
          this.logger.info("Handling `RemoveFromCart` request ", {
            ctx: CartGrpcController.name,
          });

          const cart = await this.removeFromCartUseCase.execute(
            cartId,
            courseId
          );

          this.logger.info(
            "RemoveFromCart request has been successfully completed"
          );

          return {
            success: { removed: true },
          };
        }
      );
    } catch (error) {
      this.logger.error("Error processing gRPC request `RemoveFromCart`", {
        error,
      });
      return { error: this.createErrorResponse(error) };
    }
  }
  @GrpcMethod("UserService", "ListUserCart")
  async listUserCart(data: ListCartRequest): Promise<ListCartResponse> {
    try {
      return await this.tracer.startActiveSpan(
        "CartGrpcController.removeFromCart",
        async (span) => {
          const { pagination, userId } = data!;

          span.setAttributes({ userId });
          this.logger.info("Handling `ListUserCart` request ", {
            ctx: CartGrpcController.name,
          });

          const { cart, total } =
            await this.getCartByUserUseCase.execute(
              userId,
              pagination.page,
              pagination.pageSize
            );

          this.logger.info(
            "ListUserCart request has been successfully completed"
          );
          const paginationResponse: PaginationResponse = {
            totalItems: total, // Replace with actual total items if available
            totalPages: Math.ceil(total / pagination.pageSize), // Replace with actual total pages if available
          };

          return {
            success: {
              cart: this.mapToCartResponse(cart),
              pagination: paginationResponse,
            },
          };
        }
      );
    } catch (error) {
      this.logger.error("Error processing gRPC request `ListUserCart`", {
        error,
      });
      return { error: this.createErrorResponse(error) };
    }
  }

  private mapToCartItemResponse(cartItem: CartItem): CartItemData {
    if (!cartItem) return;
    return {
      courseId: cartItem.getCourseId(),
      createdAt: cartItem.getAddedAt()?.toISOString(),
      id: cartItem.getId(),
    };
  }

  private mapToCartResponse(cart: Cart): CartData {
    if (!cart) return;
    return {
      createdAt: cart.getCreatedAt()?.toISOString(),
      id: cart.getId(),
      userId: cart.getUserId(),
      items: cart.getItems()?.map(this.mapToCartItemResponse),
      total: cart.getItems().length,
      updatedAt: cart.getUpdatedAt()?.toISOString(),
    };
  }
}
