interface SocialProps {
  id: string;
  userId: string;
  provider: string;
  profileUrl: string;
  providerUserId?: string;
}

export class UserSocials {
  constructor(private props: SocialProps) {}

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get provider(): string {
    return this.props.provider;
  }
  get profileUrl(): string {
    return this.props.profileUrl;
  }
  get providerUserId(): string {
    return this.props.providerUserId;
  }

}
