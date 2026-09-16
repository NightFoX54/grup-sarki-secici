import type { UserId } from "./users";

export type VoteValue = 1 | 0 | -1;

export type Song = {
  id: string;
  artist: string;
  title: string;
  addedBy: UserId;
  createdAt: string;
  votes: Partial<Record<UserId, VoteValue>>;
  disabledFor: { user: UserId; reason: string }[];
};
