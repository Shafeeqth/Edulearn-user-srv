import { InstructorProfile } from "./instructor-profile.entity";
import { Gender, UserProfile } from "./user-profile.entity";
import { UserSocials } from "./user-socials.entity";

export enum UserRoles {
  ADMIN = "admin",
  INSTRUCTOR = "instructor",
  STUDENT = "student",
}

export enum UserStatus {
  VERIFIED = "verified",
  NOT_VERIFIED = "not-verified",
  ACTIVE = "active",
  NOT_ACTIVE = "not-active",
  BLOCKED = "blocked",
}

export interface UserProps {
  id: string;
  email: string;
  role: UserRoles;
  status: UserStatus;
  firstName: string;
  lastName?: string;
  avatar?: string;
  lastLoginAt?: Date | undefined;
  profile?: UserProfile | undefined;
  instructorProfile?: InstructorProfile | undefined;
  socials?: UserSocials[];
  createdAt: Date;
  updatedAt?: Date;
}

export default class User {
  private props: UserProps;

  constructor(props: UserProps) {
    this.props = props;
  }

  get id() {
    return this.props.id;
  }

  get email() {
    return this.props.email;
  }
  get firstName() {
    return this.props.firstName;
  }
  get avatar() {
    return this.props.avatar;
  }
  get lastName() {
    return this.props.lastName;
  }

  get role() {
    return this.props.role;
  }

  get status() {
    return this.props.status;
  }
  get profile() {
    return this.props.profile;
  }
  get instructorProfile() {
    return this.props.instructorProfile;
  }
  get socials() {
    return this.props.socials;
  }
  get createdAt() {
    return this.props.createdAt;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }
  get lastLogin() {
    return this.props.lastLoginAt;
  }

  get fullName() {
    return `${this.props.firstName ?? ""} ${this.props.lastName ?? ""}`.trim();
  }

  promoteToInstructor(instructor: InstructorProfile) {
    if (this.props.role === UserRoles.INSTRUCTOR) return;
    this.props.role = UserRoles.INSTRUCTOR;
    this.props.instructorProfile = instructor;

    this.props.updatedAt = new Date();
  }

  block() {
    this.props.status = UserStatus.BLOCKED;
    this.props.updatedAt = new Date();
  }

  activate() {
    // if (this.props.status === UserStatus.NOT_VERIFIED)
    //     throw new Error("Cannot reactivate not verified user");
    this.props.status = UserStatus.ACTIVE;
    this.props.updatedAt = new Date();
  }

  updateStatus(status: UserStatus) {
    this.props.status = status;
    this.props.updatedAt = new Date();
  }

  updateRole(role: UserRoles) {
    this.props.role = role;
    this.props.updatedAt = new Date();
  }

  updateLastLogin(date: Date) {
    this.props.lastLoginAt = date;
  }

  toJSON() {
    return { ...this.props };
  }

  updateBasicData(data: {
    firstName: string;
    lastName?: string;
    avatar?: string;
  }) {
    this.props = {
      ...this.props,
      ...data,
      updatedAt: new Date(),
    };
  }

  updateInstructorProfile(data: {
    bio?: string;
    headline?: string;
    experience?: string;
    certificate?: string;
    expertise?: string[];
    tags?: string[];
    preferences?: Record<string, string>;
  }) {
    this.props.instructorProfile?.update(data);
  }

  updateProfile(data: {
    bio?: string;
    phone?: string;
    country?: string;
    city?: string;
    gender?: Gender;
    language?: string;
    website?: string;
    preferences?: Record<string, string>;
  }) {
    this.props.profile?.updateProfile(data);
  }

  addUserProfile(profile: UserProfile) {
    this.props.profile = profile;
  }

  addInstructorProfile(profile: InstructorProfile) {
    this.props.instructorProfile = profile;
  }

  setSocials(socials: UserSocials[]) {
    this.props.socials = socials;
  }

  // upsertSocials(params: {
  //   provider: string;
  //   profileUrl: string;
  //   providerUserId?: string;
  // }[]) {
  //   if (!this.props.socials) {
  //     this.props.socials = [];
  //   }

  //   params.forEach((param) => {
  //     const existingIdx = this.props.socials.findIndex((social) => social.provider === param.provider);
  //     if (existingIdx !== -1) {
  //       this.props.socials[existingIdx] = {
  //         ...this.props.socials[existingIdx],
  //         provider: param.provider,
  //         profileUrl: param.profileUrl,
  //         providerUserId: param.providerUserId ?? this.props.socials[existingIdx].providerUserId,
  //       };
  //     } else {
  //       const newSocial = new UserSocials({
  //         id: uu,
  //         userId: this.props.id,
  //         provider: params.provider,
  //         profileUrl: params.profileUrl,
  //         providerUserId: params.providerUserId,
  //       });
  //       this.props.socials.push(newSocial);
  //     }
  //   })

  //   const existingIndex = this.props.socials.findIndex(
  //     (social: any) => social.provider === params.provider
  //   );
  //   if (existingIndex !== -1) {
  //     // Update existing social
  //     const existing = this.props.socials[existingIndex];
  //     this.props.socials[existingIndex] = {
  //       ...existing,
  //       profileUrl: params.profileUrl,
  //       providerUserId: params.providerUserId ?? existing.providerUserId,
  //     };
  //   } else {
  //     // Create new social
  //     const newSocial = {
  //       id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
  //       userId: this.props.id,
  //       provider: params.provider,
  //       profileUrl: params.profileUrl,
  //       providerUserId: params.providerUserId,
  //     };
  //     this.props.socials.push(newSocial);
  //   }
  // }
}
