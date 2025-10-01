interface UserProps {
  id: string;
  userId: string;
  bio?: string;
  phone?: string;
  country?: string;
  city?: string;
  gender?: Gender;
  language?: string;
  website?: string;
  preferences?: Record<string, string>;
  createdAt?: Date;
}

export type Gender = "male" | "female" | "other";

export class UserProfile {
  constructor(private props: UserProps) {}

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get bio(): string {
    return this.props.bio;
  }
  get phone(): string {
    return this.props.phone;
  }
  get language(): string {
    return this.props.language;
  }
  get country(): string {
    return this.props.country;
  }
  get city(): string {
    return this.props.city;
  }
  get website(): string {
    return this.props.website;
  }
  get gender() {
    return this.props.gender;
  }
  get preferences(): Record<string, string> {
    return this.props.preferences;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  public updateProfile(data: {
    bio?: string;
    phone?: string;
    country?: string;
    city?: string;
    gender?: Gender;
    language?: string;
    website?: string;
    preferences?: Record<string, string>;
  }): void {
    this.props = {
      ...this.props,
      ...data,
    };
  }
}
