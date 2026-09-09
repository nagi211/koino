export type ProfileStatus = "pending" | "active" | "suspended";
export type ProfileRole = "member" | "leader" | "admin";
export type ConversationType = "leader_chat" | "group_room" | "dm";
export type VouchStatus = "open" | "claimed" | "vouched" | "declined";
export type PostType = "text" | "image" | "video";
export type PostStatus = "pending" | "approved" | "rejected" | "hidden";
export type ReportTarget = "post" | "message" | "profile_comment";
export type FriendshipRowStatus = "pending" | "accepted";
export type FriendshipStatus = "none" | "pending_sent" | "pending_received" | "friends";
export type NotificationType =
  | "post_like"
  | "post_comment"
  | "profile_like"
  | "profile_comment"
  | "friend_request"
  | "friend_accept"
  | "vouch_claimed"
  | "vouch_approved"
  | "vouch_declined"
  | "new_message"
  | "promoted_to_leader";

// NOTE: these are `type` aliases, not `interface`s, on purpose. Supabase's generic
// client checks each table's Row/Insert/Update against `Record<string, unknown>` via
// a conditional type, and TypeScript only grants object type *aliases* the implicit
// index signature that check needs — `interface` declarations fail it silently, which
// degrades every `.insert()`/`.rpc()` call to `never` with no error at the call site
// that created the Database type, only at every unrelated call site downstream.

export type ProfilePanelId = "photo" | "latestPost" | "wall" | "footer" | "aboutMe" | "friendSpace" | "verse";

// Shared by every panel's own text (via PanelStyle below) and by the info panel's
// per-field font override.
export type PhotoPanelFont = "default" | "serif" | "mono" | "playful" | "elegant";

export type PanelStyle = {
  background: string;
  backgroundImage: string | null;
  border: string;
  borderWidth: number;
  cornerRadius: number;
  textColor: string;
  textSize: number;
  accentColor: string;
  font: PhotoPanelFont;
};

export type ProfileTheme = {
  // null = not customized, keep the default (dark-mode-adaptive) page background —
  // independent of whether any individual panel has been customized.
  pageBackground: string | null;
  pageBackgroundImage: string | null;
  // null = default brand teal navbar with white icons/text.
  navbarBackground: string | null;
  navbarIconColor: string | null;
  panels: Partial<Record<ProfilePanelId, PanelStyle>>;
};

export type ProfilePanelLayoutItem = {
  i: ProfilePanelId;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PhotoPanelLayout =
  | "centered"
  | "side-by-side"
  | "banner"
  | "compact"
  | "card"
  | "cover"
  | "spotlight"
  | "bottom"
  | "right"
  | "card-right";
export type AvatarShape = "circle" | "square" | "diamond" | "hexagon" | "octagon" | "clover";

export type PhotoPanelTextSizes = {
  username: number;
  bio: number;
  meta: number;
  hobbies: number;
};

// null = inherit the panel's own text color (or white, if the panel has a
// background image) — same "null means default" convention as the rest of theme.
export type PhotoPanelTextColors = {
  username: string | null;
  bio: string | null;
  meta: string | null;
  hobbies: string | null;
};

export type PhotoPanelTextVisibility = {
  username: boolean;
  bio: boolean;
  meta: boolean;
  hobbies: boolean;
};

export type ProfilePhotoSettings = {
  layout: PhotoPanelLayout;
  avatarShape: AvatarShape;
  avatarSize: number;
  // Corner rounding, 0-50 (%) — only meaningful for the "square" shape (0 = sharp
  // corners, 50 = a circle); every other shape has its own fixed geometry.
  avatarCornerRadius: number;
  avatarBorderWidth: number;
  avatarBorderColor: string;
  font: PhotoPanelFont;
  textSizes: PhotoPanelTextSizes;
  textColors: PhotoPanelTextColors;
  textVisibility: PhotoPanelTextVisibility;
  // Only meaningful for the "cover" layout — null falls back to the default gradient.
  coverImageUrl: string | null;
};

export type Gender = "male" | "female";

// Cached at selection time from a public Bible API — fetched once, stored, and
// never re-fetched on ordinary profile views, so display never depends on that
// API's uptime.
export type FavoriteVerse = {
  reference: string;
  text: string;
  translation: string;
};

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  about_me: string | null;
  theme_color: string | null;
  theme_image_url: string | null;
  theme: ProfileTheme | null;
  layout: ProfilePanelLayoutItem[] | null;
  photo_settings: ProfilePhotoSettings | null;
  favorite_verse: FavoriteVerse | null;
  gender: Gender | null;
  birthday: string | null;
  location: string | null;
  hobbies: string | null;
  status: ProfileStatus;
  role: ProfileRole;
  verified: boolean;
  age_band: string | null;
  created_at: string;
};

export type VouchRequest = {
  id: string;
  guest_id: string;
  leader_id: string | null;
  status: VouchStatus;
  // The leader_chat conversation the guest created (and joined) before asking
  // to be vouched for — a leader who later claims this request joins the same
  // conversation to talk with them.
  conversation_id: string | null;
  // The guest's own words on why they're reaching out — shown to leaders
  // before they claim, and sent as the conversation's first message.
  reason: string | null;
  created_at: string;
};

export type VouchRequestWithGuest = VouchRequest & { guest: Profile };

export type Conversation = {
  id: string;
  type: ConversationType;
  created_by: string;
  created_at: string;
};

export type ConversationMember = {
  conversation_id: string;
  profile_id: string;
  joined_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type Post = {
  id: string;
  author_id: string;
  type: PostType;
  body: string | null;
  media_url: string | null;
  background: string | null;
  status: PostStatus;
  ai_flag_reason: string | null;
  created_at: string;
};

export type PostWithAuthor = Post & {
  author_username: string;
  author_avatar_url: string | null;
  like_count: number;
  comment_count: number;
};

export type PostLike = {
  post_id: string;
  profile_id: string;
  created_at: string;
};

export type PostComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type PostCommentWithAuthor = PostComment & { author_username: string; author_avatar_url: string | null };

export type SavedPost = {
  post_id: string;
  profile_id: string;
  created_at: string;
};

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipRowStatus;
  created_at: string;
};

export type FriendshipWithProfile = { friendship_id: string; profile: Profile };

export type Story = {
  id: string;
  author_id: string;
  media_url: string;
  created_at: string;
  expires_at: string;
};

export type StoryWithAuthor = Story & { author_username: string; author_avatar_url: string | null };

export type TopFriend = {
  profile_id: string;
  friend_id: string;
  position: number;
  created_at: string;
};

export type TopFriendWithProfile = { friend_id: string; position: number; profile: Profile };

export type ProfileComment = {
  id: string;
  profile_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type ProfileCommentWithAuthor = ProfileComment & { author_username: string; author_avatar_url: string | null };

export type ProfileLike = {
  profile_id: string;
  liker_id: string;
  created_at: string;
};

export type ProfileView = {
  profile_id: string;
  viewer_id: string;
  viewed_at: string;
  // Part of the primary key (with profile_id + viewer_id) — lets the same viewer
  // add a new view once per calendar day, instead of capping at one view ever.
  viewed_date: string;
};

export type ProfileViewWithProfile = { viewer_id: string; viewed_at: string; profile: Profile };

export type Report = {
  id: string;
  target_type: ReportTarget;
  target_id: string;
  reporter_id: string;
  reason: string;
  resolved: boolean;
  created_at: string;
};

export type AdminAction = {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  notes: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  post_id: string | null;
  conversation_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationWithActor = Notification & {
  actor_username: string | null;
  actor_avatar_url: string | null;
};

export type RoleEndorsement = {
  id: string;
  candidate_id: string;
  endorser_id: string;
  created_at: string;
};

/** Matches the public schema for typed Supabase client instantiation in each app. */
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string; username: string }; Update: Partial<Profile>; Relationships: [] };
      vouch_requests: { Row: VouchRequest; Insert: Partial<VouchRequest> & { guest_id: string }; Update: Partial<VouchRequest>; Relationships: [] };
      conversations: { Row: Conversation; Insert: Partial<Conversation> & { type: ConversationType; created_by: string }; Update: Partial<Conversation>; Relationships: [] };
      conversation_members: { Row: ConversationMember; Insert: ConversationMember; Update: Partial<ConversationMember>; Relationships: [] };
      messages: { Row: Message; Insert: Partial<Message> & { conversation_id: string; sender_id: string; body: string }; Update: Partial<Message>; Relationships: [] };
      posts: { Row: Post; Insert: Partial<Post> & { author_id: string; type: PostType }; Update: Partial<Post>; Relationships: [] };
      post_likes: { Row: PostLike; Insert: Partial<PostLike> & { post_id: string; profile_id: string }; Update: Partial<PostLike>; Relationships: [] };
      post_comments: { Row: PostComment; Insert: Partial<PostComment> & { post_id: string; author_id: string; body: string }; Update: Partial<PostComment>; Relationships: [] };
      saved_posts: { Row: SavedPost; Insert: Partial<SavedPost> & { post_id: string; profile_id: string }; Update: Partial<SavedPost>; Relationships: [] };
      friendships: { Row: Friendship; Insert: Partial<Friendship> & { requester_id: string; addressee_id: string }; Update: Partial<Friendship>; Relationships: [] };
      stories: { Row: Story; Insert: Partial<Story> & { author_id: string; media_url: string }; Update: Partial<Story>; Relationships: [] };
      top_friends: { Row: TopFriend; Insert: Partial<TopFriend> & { profile_id: string; friend_id: string; position: number }; Update: Partial<TopFriend>; Relationships: [] };
      profile_comments: { Row: ProfileComment; Insert: Partial<ProfileComment> & { profile_id: string; author_id: string; body: string }; Update: Partial<ProfileComment>; Relationships: [] };
      profile_likes: { Row: ProfileLike; Insert: Partial<ProfileLike> & { profile_id: string; liker_id: string }; Update: Partial<ProfileLike>; Relationships: [] };
      profile_views: { Row: ProfileView; Insert: Partial<ProfileView> & { profile_id: string; viewer_id: string }; Update: Partial<ProfileView>; Relationships: [] };
      reports: { Row: Report; Insert: Partial<Report> & { target_type: ReportTarget; target_id: string; reporter_id: string; reason: string }; Update: Partial<Report>; Relationships: [] };
      admin_actions: { Row: AdminAction; Insert: Partial<AdminAction> & { admin_id: string; action: string; target_type: string; target_id: string }; Update: Partial<AdminAction>; Relationships: [] };
      notifications: { Row: Notification; Insert: Partial<Notification> & { recipient_id: string; type: NotificationType }; Update: Partial<Notification>; Relationships: [] };
      role_endorsements: { Row: RoleEndorsement; Insert: Partial<RoleEndorsement> & { candidate_id: string; endorser_id: string }; Update: Partial<RoleEndorsement>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      claim_vouch_request: { Args: { request_id: string }; Returns: void };
      vouch_for_user: { Args: { request_id: string; approve: boolean }; Returns: void };
      set_post_status: { Args: { post_id: string; new_status: PostStatus; reason: string | null }; Returns: void };
      set_profile_verified: { Args: { p_target_id: string; verified_value: boolean }; Returns: void };
      start_dm_conversation: { Args: { other_id: string }; Returns: string };
      endorse_for_leader: { Args: { p_candidate_id: string }; Returns: void };
      set_profile_role: { Args: { p_target_id: string; new_role: ProfileRole }; Returns: void };
      set_profile_status: { Args: { p_target_id: string; new_status: ProfileStatus }; Returns: void };
      resolve_message_report_sender: {
        Args: { p_report_id: string };
        Returns: { sender_id: string; username: string; avatar_url: string | null }[];
      };
    };
  };
};
