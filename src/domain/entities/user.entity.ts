export enum UserRoles {
  ADMIN = "ADMIN",
  INSTRUCTOR = "INSTRUCTOR",
  STUDENT = "STUDENT",
}

export enum UserStatus {
  VERIFIED = "verified",
  NOT_VERIFIED = "not-verified",
  ACTIVE = "active",
  NOT_ACTIVE = "not-active",
  BLOCKED = "blocked",
}

export default class User {
  private status: UserStatus = UserStatus.NOT_VERIFIED;
  private createdAt: Date;
  private updatedAt: Date;
  private id: string;
  private email: string;
  private role: UserRoles;
  private firstName?: string;
  private lastName?: string;
  private avatar?: string;
  private phone?: string;
  private linkedin?: string;
  private instagram?: string;
  private facebook?: string;
  private language?: string;
  private website?: string;
  private biography?: string;
  private headline?: string;
  private country?: string;
  private city?: string;
  private expertise?: string;
  private experience?: number;
  private education?: string;
  private alternativeEmail?: string;

  private constructor(
    id: string,
    email: string,
    firstName: string,
    lastName?: string,
    avatar?: string,
    status?: UserStatus,
    role?: UserRoles,
    createdAt?: Date
  ) {
    this.id = id;
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.status = status || UserStatus.NOT_VERIFIED;
    this.role = role || UserRoles.STUDENT;
    this.avatar = avatar;
    this.createdAt = createdAt || new Date();
    this.updatedAt = new Date();
  }

  // Factory method
  static create(
    id: string,
    email: string,
    firstName: string,
    lastName?: string,
    avatar?: string,
    status?: UserStatus,
    role?: UserRoles,
    createdAt?: Date
  ) {
    return new User(
      id,
      email,
      firstName,
      lastName,
      avatar,
      status,
      role,
      createdAt
    );
  }

  // Domain methods
  updateStatus(status: UserStatus) {
    this.status = status;
    this.updatedAt = new Date();
  }

  updateRole(role: UserRoles) {
    this.role = role;
    this.updatedAt = new Date();
  }
  updateToInstructor() {
    this.role = UserRoles.INSTRUCTOR;
    this.updatedAt = new Date();
  }

  block() {
    this.status = UserStatus.BLOCKED;
    this.updatedAt = new Date();
  }

  unblockUser() {
    this.status = UserStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  updateUserDetails(details: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    language?: string;
    website?: string;
    biography?: string;
    headline?: string;
    phone?: string;
    country?: string;
    city?: string;
    expertise?: string;
    experience?: number;
    education?: string;
    alternativeEmail?: string;
  }) {
    this.firstName = details.firstName;
    this.lastName = details.lastName;
    this.avatar = details.avatar;
    this.phone = details.phone;
    this.linkedin = details.linkedin;
    this.instagram = details.instagram;
    this.facebook = details.facebook;
    this.language = details.language;
    this.website = details.website;
    this.biography = details.biography;
    this.headline = details.headline;
    this.phone = details.phone;
    this.country = details.country;
    this.city = details.city;
    this.expertise = details.expertise;
    this.experience = details.experience;
    this.education = details.education;
    this.alternativeEmail = details.alternativeEmail;
    this.updatedAt = new Date();
  }

  // Getters
  getId(): string {
    return this.id;
  }

  getFirstName() {
    return this.firstName;
  }

  getLastName() {
    return this.lastName;
  }
  getAvatar() {
    return this.avatar;
  }
  getPhone() {
    return this.phone;
  }
  getLinkedin() {
    return this.linkedin;
  }
  getInstagram() {
    return this.instagram;
  }
  getFacebook() {
    return this.facebook;
  }
  getCity() {
    return this.city;
  }
  getCountry() {
    return this.country;
  }
  getExperience() {
    return this.experience;
  }
  getExpertise() {
    return this.expertise;
  }
  getEducation() {
    return this.education;
  }
  getLanguage() {
    return this.language;
  }
  getAlternativeEmail() {
    return this.alternativeEmail;
  }
  getWebsite() {
    return this.website;
  }
  getBio() {
    return this.biography;
  }
  getHeadline() {
    return this.headline;
  }
  getEmail(): string {
    return this.email;
  }
  getRole(): UserRoles {
    return this.role;
  }
  getStatus(): UserStatus {
    return this.status;
  }
  getCreatedAt() {
    return this.createdAt;
  }
  getUpdatedAt() {
    return this.updatedAt;
  }

  // Setters

  setLastName(lastName: string) {
    this.lastName = lastName;
  }
  setFirstName(firstName: string) {
    this.firstName = firstName;
  }
  setAvatar(avatar: string) {
    this.avatar = avatar;
  }
  setPhone(phone: string) {
    this.phone = phone;
  }
  setLinkedin(linkedin: string) {
    this.linkedin = linkedin;
  }
  setInstagram(instagram: string) {
    this.instagram = instagram;
  }
  setFacebook(facebook: string) {
    this.facebook = facebook;
  }
  setLanguage(lang: string) {
    this.language = lang;
  }
  setAlternativeEmail(alternativeEmail: string) {
    this.alternativeEmail = alternativeEmail;
  }
  setWebsite(website: string) {
    this.website = website;
  }
  setBio(biography: string) {
    this.biography = biography;
  }
  setHeadline(headline: string) {
    this.headline = headline;
  }
  setEmail(email: string) {
    this.email = email;
  }
  setRole(role: UserRoles) {
    this.role = role;
  }
  setStatus(status: UserStatus) {
    this.status = status;
  }

  setCity(city: string) {
    this.city = city;
  }
  setCountry(country: string) {
    this.country = country;
  }
  setExperience(experience: number) {
    this.experience = experience;
  }
  setExpertise(expertise: string) {
    this.expertise = expertise;
  }
  setEducation(education: string) {
    this.education = education;
  }
  setCreatedAt(date: Date) {
    this.createdAt = date;
  }
  setUpdatedAt(date: Date) {
    this.updatedAt = date;
  }
}
