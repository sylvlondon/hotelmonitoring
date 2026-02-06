import type { HotelConfig } from '../types.js';

export const DEFAULT_TIMEZONE = process.env.TZ ?? 'Europe/Paris';
export const LOOKAHEAD_NIGHTS = Number(process.env.LOOKAHEAD_NIGHTS ?? 7);

export const HOTELS: HotelConfig[] = [
  {
    hotel_id: 'maison_pavlov',
    hotel_name: 'Maison Pavlov',
    provider: 'secure_direct_numbered',
    booking_url:
      'https://www.secure-direct-hotel-booking.com/module_booking_engine/index.php?id_etab=46249f1124e703947d3298deefeb8493&langue=francais',
    total_rooms: 8,
    timezone: DEFAULT_TIMEZONE,
  },
  {
    hotel_id: 'les_seraphines',
    hotel_name: 'Les Séraphines',
    provider: 'thais_calendar',
    booking_url: 'https://lesseraphines.thais-hotel.com/direct-booking/calendar',
    total_rooms: 5,
    timezone: DEFAULT_TIMEZONE,
  },
  {
    hotel_id: 'villa_victor_louis',
    hotel_name: 'Villa Victor Louis',
    provider: 'secure_direct_stock_counter',
    booking_url:
      'https://www.secure-direct-hotel-booking.com/module_booking_engine/index.php?id_etab=540835380b24ce9a38e47ab1436e5d11&langue=francais',
    total_rooms: 8,
    timezone: DEFAULT_TIMEZONE,
  },
];
