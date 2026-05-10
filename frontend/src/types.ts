export type TransportMode = 'walking' | 'transit' | 'driving' | 'bicycling';

export interface ItineraryStop {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  startTime: string;   // "HH:mm"
  endTime: string;
  estimatedCost: number;
  notes: string;
  tickets_required_online: boolean;
  reservation_recommended: boolean;
  local_tips: string;
}

export interface RouteOption {
  id: string;
  routeName: string;
  personaFitSummary: string;
  totalEstimatedCost: number;
  totalDurationMinutes: number;
  transportMode: TransportMode;
  itinerary: ItineraryStop[];
  googleMapsUrl: string;
  imageUrl: string;
}

export interface CityFact {
  title: string;          // Short headline
  description: string;    // 1–3 sentence explanation
  icon?: string;          // Optional emoji/icon
}

export interface RoutesResponse {
  routeOptions: RouteOption[];
  cityFacts: CityFact[];   // NEW
}