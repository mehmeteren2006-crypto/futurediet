// lib/types.ts
// Uygulama genelinde kullanılan TypeScript arayüzleri

export interface UserContext {
  full_name:               string;
  age:                     number;
  gender:                  string;
  weight_kg:               number;
  height_cm:               number;
  bmr:                     number;
  daily_calorie_target:    number;
  dietary_preferences:     string;
  sleep_start_time:        string | null;
  sleep_end_time:          string | null;
  activity_level:          number;
  total_calories_consumed: number | null;
  total_calories_burned:   number | null;
  step_count:              number | null;
  sleep_duration_hrs:      number | null;
  meals_today:             string;
}

export interface ChatMessage {
  id:              string;
  sender_type:     "user" | "ai";
  message_content: string;
  created_at:      string;
}

export interface Meal {
  id:             string;
  daily_log_id:   string;
  meal_name:      string;
  meal_type:      "breakfast" | "lunch" | "dinner" | "snack";
  total_calories: number;
  protein_g:      number;
  carbs_g:        number;
  fat_g:          number;
  fiber_g:        number;
  image_url:      string | null;
  is_vegetarian:  boolean;
  entry_source:   "manual" | "vision_ai" | "barcode_scan";
  logged_at:      string;
}

export interface DailyLog {
  id:                      string;
  user_id:                 string;
  log_date:                string;
  total_calories_consumed: number;
  total_calories_burned:   number;
  step_count:              number;
  sleep_duration_hrs:      number | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?:   T;
  error?:  string;
}
