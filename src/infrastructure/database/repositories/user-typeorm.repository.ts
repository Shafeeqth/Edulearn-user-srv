import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserOrmEntity } from "../entities/user-orm-entity";
import { UserRepository } from "src/domain/repositories/user.repository";
import { RedisService } from "src/infrastructure/redis/redis.service";
import { LoggingService } from "src/infrastructure/observability/logging/logging.service";
import { TracingService } from "src/infrastructure/observability/tracing/trace.service";
import { MetricsService } from "src/infrastructure/observability/metrics/metrics.service";
import User, { UserRoles, UserStatus } from "src/domain/entities/user-entity";
import { InstructorProfileOrmEntity } from "../entities/instructor-profile-orm.entity";
import { UserProfileOrmEntity } from "../entities/user-profile-orm.entiry";
import { UserSocialOrmEntity } from "../entities/socials-orm.entity";
import { UserProfile } from "src/domain/entities/user-profile.entity";
import { InstructorProfile } from "src/domain/entities/instructor-profile.entity";
import { UserSocials } from "src/domain/entities/user-socials.entity";

Injectable();
export default class UserTypeOrmRepositoryImpl implements UserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repo: Repository<UserOrmEntity>,
    private readonly cache: RedisService,
    private readonly logger: LoggingService,
    private readonly tracer: TracingService,
    private readonly metrics: MetricsService
  ) {}

  public async save(user: User): Promise<User> {
    return await this.tracer.startActiveSpan(
      "PostgresUserRepository.create",
      async (span) => {
        span.setAttributes({
          "db.operation": "insert",
          "user.email": user.email,
        });

        this.logger.debug(
          `Creating user in database with email: ${user.email}`
        );
        try {
          const ormUser = this.mapToEntity(user);
          const newUser = this.repo.create(ormUser);
          const savedUser = await this.repo.save(newUser);

          if (savedUser) {
            this.logger.debug(
              `User created successfully with ID: ${savedUser.id}`
            );
            span.setAttribute("User.created", true);
            await Promise.allSettled([
              this.cache.set(`db:user:${savedUser.id}`, savedUser, 3600),
              this.cache.set(
                `db:user:email:${savedUser.email}`,
                savedUser,
                3600
              ),
            ]);
          } else {
            this.logger.debug(
              `Failed to create user with email: ${user.email}`
            );
            span.setAttribute("User.created", false);
          }
          return this.mapToDomain(savedUser);
        } catch (error) {
          this.logger.warn(`Error creating user with email: ${user.email}`, {
            error,
          });
          throw error;
        }
      }
    );
  }

  public async findById(userId: string): Promise<User | null> {
    try {
      return await this.tracer.startActiveSpan(
        "PostgresUserRepository.findById",
        async (span) => {
          span.setAttributes({
            "db.operation": "select",
            "user.id": userId,
          });

          this.logger.debug(`Fetching user from database with ID: ${userId}`);
          this.logger.debug(`Querying redis for user data with ID: ${userId}`);

          // Read-through cache: Check cache first
          const cachedUser = await this.cache.get<UserOrmEntity>(
            `db:user:${userId}`
          );
          if (cachedUser) {
            this.logger.debug(`Redis cache hit for user with ID: ${userId}`);
            span.setAttribute("cache.hit", true);
            return this.mapToDomain(cachedUser);
          }
          this.logger.debug(`Redis cache miss for user with ID: ${userId}`);
          span.setAttribute("cache.hit", false);

          // Fetch from db if not in cache
          this.logger.debug(
            "Querying database for user data with ID: " + userId
          );
          const endTimer = this.metrics.measureDBOperationDuration(
            "findById",
            "SELECT"
          );
          this.metrics.incrementDBRequestCounter("SELECT");
          const user = await this.repo.findOne({
            where: { id: userId },
            relations: ["socials", "profile", "instructorProfile"],
            // select: ['id', 'avatar', 'status', 'email', 'role'],
          });
          endTimer();
          if (user) {
            this.logger.debug("User found in DB with ID: " + userId);
            span.setAttribute("User.found", true);
            await this.cache.set(`db:user:${userId}`, user); // Cache the result
          } else {
            this.logger.debug("User not found in DB with ID: " + userId);
            span.setAttribute("User.found", false);
          }
          return user ? this.mapToDomain(user) : null;
        }
      );
    } catch (error) {
      this.logger.warn(`Error fetching user ${userId}`, { error });
      throw error;
    }
  }
  public async findWithRelations(userId: string): Promise<User | null> {
    try {
      return await this.tracer.startActiveSpan(
        "PostgresUserRepository.findWithRelations",
        async (span) => {
          span.setAttributes({
            "db.operation": "select",
            "user.id": userId,
          });

          this.logger.debug(`Fetching user from database with ID: ${userId}`);
          this.logger.debug(`Querying redis for user data with ID: ${userId}`);

          // Read-through cache: Check cache first
          const cachedUser = await this.cache.get<UserOrmEntity>(
            `db:user:relations:${userId}`
          );
          if (cachedUser) {
            this.logger.debug(`Redis cache hit for user with ID: ${userId}`);
            span.setAttribute("cache.hit", true);
            return this.mapToDomain(cachedUser);
          }
          this.logger.debug(`Redis cache miss for user with ID: ${userId}`);
          span.setAttribute("cache.hit", false);

          // Fetch from db if not in cache
          this.logger.debug(
            "Querying database for user data with ID: " + userId
          );
          const endTimer = this.metrics.measureDBOperationDuration(
            "findWithRelations",
            "SELECT"
          );
          this.metrics.incrementDBRequestCounter("SELECT");
          const user = await this.repo.findOne({
            where: { id: userId },
            relations: [
              "wishlist",
              "cart",
              "socials",
              "profile",
              "instructorProfile",
            ],
            // select: ['id', 'avatar', 'status', 'email', 'role'],
          });
          endTimer();
          if (user) {
            this.logger.debug("User found in DB with ID: " + userId);
            span.setAttribute("User.found", true);
            await this.cache.set(`db:user:relations:${userId}`, user); // Cache the result
          } else {
            this.logger.debug("User not found in DB with ID: " + userId);
            span.setAttribute("User.found", false);
          }
          return user ? this.mapToDomain(user) : null;
        }
      );
    } catch (error) {
      this.logger.warn(`Error fetching user ${userId}`, { error });
      throw error;
    }
  }

  public async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.tracer.startActiveSpan(
        "PostgresUserRepository.findByEmail",
        async (span) => {
          span.setAttributes({
            "db.operation": "select",
            "user.email": email,
          });
          this.logger.debug(`Fetching user from database with email: ${email}`);
          const cachedUser = await this.cache.get<UserOrmEntity>(
            `db:user:email:${email}`
          );
          if (cachedUser) {
            this.logger.debug(`Redis cache hit for user with email: ${email}`);
            return this.mapToDomain(cachedUser);
          }

          const endTimer = this.metrics.measureDBOperationDuration(
            "findByEmail",
            "SELECT"
          );
          this.metrics.incrementDBRequestCounter("SELECT");
          const user = await this.repo.findOne({
            where: { email },
            relations: ["socials", "profile", "instructorProfile"],
          });
          endTimer();

          if (user) {
            this.logger.debug(`User found in DB with email: ${email}`);
            span.setAttribute("User.found", true);
            await this.cache.set(`db:user:email:${email}`, user, 3600);
          } else {
            this.logger.debug(`User not found in DB with email: ${email}`);
            span.setAttribute("User.found", false);
          }
          return user ? this.mapToDomain(user) : null;
        }
      );
    } catch (error) {
      this.logger.warn(`Error fetching user with email: ${email}`, {
        error,
      });
      throw error;
    }
  }

  // public async delete(userId: string): Promise<void> {
  //   return await this.tracer.startActiveSpan(
  //     "PostgresUserRepository.delete",
  //     async (span) => {
  //       span.setAttributes({
  //         "db.operation": "update",
  //         "user.id": userId,
  //       });
  //       this.logger.debug(`Deleting user from database with ID: ${userId}`);
  //       try {
  //         const endTimer = this.metrics.measureDBOperationDuration(
  //           "delete",
  //           "DELETE"
  //         );
  //         this.metrics.incrementDBRequestCounter("DELETE");
  //         const [, userResponse] = await Promise.allSettled([
  //           this.repo.update({ id: userId }, { status: UserStatus.BLOCKED }),
  //           this.repo.findOne({ where: { id: userId } }),
  //         ]);
  //         endTimer();

  //         const operations = [
  //           this.cache.del(`db:user:${userId}`),
  //           this.cache.del(`db:users:page:*`),
  //         ];

  //         if (userResponse.status === "fulfilled" && userResponse.value) {
  //           const user = userResponse.value;
  //           operations.push(this.cache.del(`db:user:email:${user.email}`));
  //         }

  //         await Promise.all(operations);
  //         this.logger.debug(`User deleted successfully with ID: ${userId}`);
  //         span.setAttribute("User.deleted", true);
  //       } catch (error) {
  //         this.logger.warn(`Error deleting user with ID: ${userId}`, { error });
  //         this.tracer.recordException(span, error);
  //         throw error;
  //       }
  //     }
  //   );
  // }

  public async update(userId: string, data: User): Promise<User> {
    try {
      return await this.tracer.startActiveSpan(
        "PostgresUserRepository.update",
        async (span) => {
          span.setAttributes({
            "db.operation": "update",
            "user.id": userId,
          });
          this.logger.debug(`Updating user in database with ID: ${userId}`);

          // Get the existing user first
          const existingUser = await this.repo.findOne({
            where: { id: userId },
            relations: ["socials", "profile", "instructorProfile"],
          });

          if (!existingUser) {
            throw new Error(`User with ID ${userId} not found`);
          }

          // Map domain user to ORM entity, excluding relationships for now
          const modelData = this.mapToEntity(data as User);

          // Remove relationships from the update data since we'll handle them separately
          const { socials, profile, instructorProfile, ...updateData } =
            modelData;

          const endTimer = this.metrics.measureDBOperationDuration(
            "update",
            "UPDATE"
          );
          this.metrics.incrementDBRequestCounter("UPDATE");

          // Update the main user entity (without relationships)
          await this.repo.update({ id: userId }, updateData);

          // Handle profile separately if it exists
          if (profile) {
            // Use upsert approach: update if exists, insert if not
            await this.repo.manager.upsert(UserProfileOrmEntity, profile, {
              conflictPaths: ["userId"],
              skipUpdateIfNoValuesChanged: true,
            });
          }

          // Handle instructor profile separately if it exists
          if (instructorProfile) {
            // Use upsert approach: update if exists, insert if not
            await this.repo.manager.upsert(
              InstructorProfileOrmEntity,
              instructorProfile,
              {
                conflictPaths: ["userId"],
                skipUpdateIfNoValuesChanged: true,
              }
            );
          }

          // Handle socials separately if they exist
          if (socials && socials.length > 0) {
            // Remove existing socials
            if (existingUser.socials && existingUser.socials.length > 0) {
              await this.repo.manager.delete(UserSocialOrmEntity, { userId });
            }

            // Insert new socials
            await this.repo.manager.save(UserSocialOrmEntity, socials);
          }

          // Fetch the updated user with all relations
          const updatedUser = await this.repo.findOne({
            where: { id: userId },
            relations: ["socials", "profile", "instructorProfile"],
          });
          endTimer();

          if (updatedUser) {
            this.logger.debug(`User updated successfully with ID: ${userId}`);
            span.setAttribute("User.updated", true);
            await Promise.all([
              this.cache.set(`db:user:${userId}`, updatedUser, 3600),
              this.cache.set(
                `db:user:email:${updatedUser.email}`,
                updatedUser,
                3600
              ),
            ]);
          } else {
            this.logger.debug(`Failed to update user with ID: ${userId}`);
            span.setAttribute("User.updated", false);
          }
          return updatedUser ? this.mapToDomain(updatedUser) : null;
        }
      );
    } catch (error) {
      this.logger.warn(`Error updating user with ID: ${userId}`, { error });
      throw error;
    }
  }

  public async findAllUsersEmail(): Promise<string[]> {
    try {
      return await this.tracer.startActiveSpan(
        "PostgresUserRepository.getAllUserEmails",
        async (span) => {
          span.setAttributes({
            "db.operation": "select",
          });
          this.logger.debug("Fetching all user emails from database");
          const endTimer = this.metrics.measureDBOperationDuration(
            "getAllUserEmails",
            "SELECT"
          );
          this.metrics.incrementDBRequestCounter("SELECT");
          const emails = await this.repo.find({ select: ["email"] });
          endTimer();

          this.logger.debug("Fetched all user emails successfully");
          span.setAttribute("UserEmails.found", true);
          return emails.map((user) => user.email);
        }
      );
    } catch (error) {
      this.logger.warn("Error fetching all user emails", { error });
      throw error;
    }
  }

  public async findInstructors(
    limit: number,
    offset: number
  ): Promise<User[] | []> {
    try {
      return await this.tracer.startActiveSpan(
        "PostgresUserRepository.getAllInstructors",
        async (span) => {
          span.setAttributes({
            "db.operation": "select",
            "query.limit": limit,
            "query.offset": offset,
          });
          this.logger.debug(
            `Redis cache hit for instructors with limit: ${limit}, offset: ${offset}`
          );
          const cacheKey = `db:instructors:limit${limit}:offset:${offset}`;
          const cachedInstructors =
            await this.cache.get<UserOrmEntity[]>(cacheKey);
          if (cachedInstructors) {
            this.logger.debug(
              `Redis cache hit for instructors with limit: ${limit}, offset: ${offset}`
            );
            span.setAttribute("cache.hit", true);
            return cachedInstructors.map(this.mapToDomain);
          }
          this.logger.debug(
            `Redis cache miss for instructors with limit: ${limit}, offset: ${offset}`
          );
          span.setAttribute("cache.hit", false);

          const endTimer = this.metrics.measureDBOperationDuration(
            "getAllInstructors",
            "SELECT"
          );
          this.metrics.incrementDBRequestCounter("SELECT");
          const instructors = await this.repo.find({
            where: { role: UserRoles.INSTRUCTOR },
            skip: offset,
            take: limit,
          });
          endTimer();

          await this.cache.set(cacheKey, instructors, 300);
          this.logger.debug(
            `Fetched instructors successfully from DB with limit: ${limit}, offset: ${offset}`
          );
          span.setAttribute("Instructors.found", true);
          return instructors.map(this.mapToDomain);
        }
      );
    } catch (error) {
      this.logger.warn(
        `Error fetching instructors with limit: ${limit}, offset: ${offset}`,
        {
          error,
        }
      );
      throw error;
    }
  }

  public async findUsersByIds(ids: string[]): Promise<User[]> {
    try {
      return await this.tracer.startActiveSpan(
        "PostgresUserRepository.findUsersByIds",
        async (span) => {
          span.setAttributes({
            "db.operation": "select",
          });
          this.logger.debug(
            `Fetching users from database with ids length: ${ids.length}`
          );
          const cacheKey = `db:users:ids:${ids.join(",")}`;
          const cachedUsers = await this.cache.get<UserOrmEntity[]>(cacheKey);
          if (cachedUsers) {
            this.logger.debug(`Redis cache hit for users with ids`);
            return cachedUsers.map(this.mapToDomain);
          }

          const endTimer = this.metrics.measureDBOperationDuration(
            "findUsersByIds",
            "SELECT"
          );
          this.metrics.incrementDBRequestCounter("SELECT");
          const users = await this.repo
            .createQueryBuilder("user")
            .where("user.id IN (:...ids)", { ids })
            .getMany();

          endTimer();

          await this.cache.set(cacheKey, users, 300);
          this.logger.debug(
            `Fetched users successfully from DB with length: ${users.length}`
          );
          span.setAttribute("Users.found", true);
          return users.map(this.mapToDomain);
        }
      );
    } catch (error) {
      this.logger.warn(`Error fetching users with length: ${ids.length}`, {
        error,
      });
      throw error;
    }
  }

  public async findUsers(offset: number, limit: number): Promise<User[] | []> {
    try {
      return await this.tracer.startActiveSpan(
        "PostgresUserRepository.getAllUsers",
        async (span) => {
          span.setAttributes({
            "db.operation": "select",
            "query.limit": limit,
            "query.offset": offset,
          });
          this.logger.debug(
            `Fetching users from database with limit: ${limit}, offset: ${offset}`
          );
          const cacheKey = `db:users:limit${limit}:offset:${offset}`;
          const cachedUsers = await this.cache.get<UserOrmEntity[]>(cacheKey);
          if (cachedUsers) {
            this.logger.debug(
              `Redis cache hit for users with limit: ${limit}, offset: ${offset}`
            );
            span.setAttribute("Redis.users.cache.hit", true);
            return cachedUsers.map(this.mapToDomain);
          }
          this.logger.debug(
            `Redis cache miss for users with limit: ${limit}, offset: ${offset}`
          );
          span.setAttribute("Redis.users.cache.hit", false);

          const endTimer = this.metrics.measureDBOperationDuration(
            "getAllUsers",
            "SELECT"
          );
          this.metrics.incrementDBRequestCounter("SELECT");
          const users = await this.repo.find({
            skip: offset,
            take: limit,
          });
          endTimer();

          await this.cache.set(cacheKey, users, 300);
          this.logger.debug(
            `Fetched users successfully from DB with limit: ${limit}, offset: ${offset}`
          );
          span.setAttribute("Users.found", true);
          return users.map(this.mapToDomain);
        }
      );
    } catch (error) {
      this.logger.warn(
        `Error fetching users with limit: ${limit}, offset: ${offset}`,
        {
          error,
        }
      );
      throw error;
    }
  }

  private mapToDomain(user: UserOrmEntity): User {
    const domainUser = new User({
      ...user,
      createdAt: user.createdAt,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      id: user.id,
      role: user.role,
      status: user.status,
      updatedAt: user.updatedAt,
      avatar: user.avatarUrl,
      profile: user.profile ? new UserProfile({ ...user.profile }) : undefined,
      instructorProfile: user.instructorProfile
        ? new InstructorProfile({
            ...user.instructorProfile,
            userId: user.id,
          })
        : undefined,
      socials: user.socials?.map(
        (social) => new UserSocials({ ...social, userId: user.id })
      ),
    });

    return domainUser;
  }

  private mapToEntity(user: User): UserOrmEntity {
    const ormEntity = new UserOrmEntity();
    ormEntity.status = user.status;
    ormEntity.createdAt = user.createdAt;
    ormEntity.updatedAt = user.updatedAt;
    ormEntity.id = user.id;
    ormEntity.email = user.email;
    ormEntity.role = user.role;
    ormEntity.firstName = user.firstName;
    ormEntity.lastName = user.lastName;
    ormEntity.avatarUrl = user.avatar;
    ormEntity.lastLoginAt = user.lastLogin;

    // Only create instructor profile if it has meaningful data
    if (user.instructorProfile && user.instructorProfile.id) {
      const ormInstructorProfile = new InstructorProfileOrmEntity();
      const instructor = user.instructorProfile;
      ormInstructorProfile.id = instructor.id;
      ormInstructorProfile.userId = user.id;
      ormInstructorProfile.bio = instructor.bio;
      ormInstructorProfile.certificate = instructor.certificate;
      ormInstructorProfile.experience = instructor.experience;
      ormInstructorProfile.expertise = instructor.expertise;
      ormInstructorProfile.headline = instructor.headline;
      ormInstructorProfile.rating = instructor.rating;
      ormInstructorProfile.tags = instructor.tags;
      ormInstructorProfile.totalCourses = instructor.totalCourses;
      ormInstructorProfile.totalStudents = instructor.totalStudents;
      ormEntity.instructorProfile = ormInstructorProfile;
    }

    // Only create user profile if it has meaningful data
    if (user.profile && user.profile.id) {
      const ormUserProfile = new UserProfileOrmEntity();
      const userProfile = user.profile;
      ormUserProfile.id = userProfile.id;
      ormUserProfile.userId = user.id;
      ormUserProfile.bio = userProfile.bio;
      ormUserProfile.language = userProfile.language;
      ormUserProfile.website = userProfile.website;
      ormUserProfile.city = userProfile.city;
      ormUserProfile.country = userProfile.country;
      ormUserProfile.gender = userProfile.gender;
      ormUserProfile.phone = userProfile.phone;
      ormUserProfile.preferences = userProfile.preferences;
      ormEntity.profile = ormUserProfile;
    }

    // Only create socials if they exist
    if (user.socials && user.socials.length > 0) {
      ormEntity.socials = user.socials.map((social) => {
        const socialEntity = new UserSocialOrmEntity();
        socialEntity.id = social.id;
        socialEntity.profileUrl = social.profileUrl;
        socialEntity.provider = social.provider;
        socialEntity.providerUserId = social.providerUserId;
        socialEntity.userId = user.id;
        return socialEntity;
      });
    }

    return ormEntity;
  }
}
