export const USERS = ["berkay", "mert", "eren", "sarp"] as const;

export type UserId = (typeof USERS)[number];

export const USER_LABELS: Record<UserId, string> = {
  berkay: "Berkay",
  mert: "Mert",
  eren: "Eren",
  sarp: "Sarp",
};

export function isUserId(value: unknown): value is UserId {
  return typeof value === "string" && (USERS as readonly string[]).includes(value);
}
