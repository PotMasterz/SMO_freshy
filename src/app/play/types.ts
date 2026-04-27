export type StageDTO = {
  id: string;
  order_index: number;
  label: string;
  max_attempts: number;
  cooldown_seconds: number;
  passcode_set: boolean;
  attempts_used: number;
  attempts_remaining: number;
  solved: boolean;
  seconds_remaining: number;
};
