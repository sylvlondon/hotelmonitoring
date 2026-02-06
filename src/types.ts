export type Provider =
  | 'secure_direct_numbered'
  | 'thais_calendar'
  | 'secure_direct_stock_counter';

export interface HotelConfig {
  hotel_id: string;
  hotel_name: string;
  provider: Provider;
  booking_url: string;
  total_rooms: number;
  timezone: string;
}

export type RecordStatus = 'ok' | 'no_availability' | 'error';

export interface CollectResult {
  available_rooms_count: number;
  available_room_ids_or_categories: string;
  status: Exclude<RecordStatus, 'error'>;
}

export interface SheetRecord {
  run_id: string;
  run_ts_utc: string;
  run_ts_local: string;
  hotel_id: string;
  hotel_name: string;
  provider: Provider;
  target_date: string;
  available_rooms_count: number;
  total_rooms: number;
  occupancy_ratio: number;
  available_room_ids_or_categories: string;
  status: RecordStatus;
  error_code: string;
  error_message: string;
}

export class CollectError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CollectError';
  }
}
