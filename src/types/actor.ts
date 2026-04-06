export type ActorStatus = "working" | "going_home" | "cleaning" | "sleeping" | "biking" | "at_home";
export type AtHomeMode = "idle" | "gaming" | "streaming" | "reading";

export type ActorLocation = "office" | "road" | "home";

export interface ActorState {
  id: string;
  name: string;
  status: ActorStatus;
  homeMode: AtHomeMode;
  location: ActorLocation;
  updatedAt: string;
  updatedBy: string;
}
