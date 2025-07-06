import { Request } from 'express';

export enum TravelMode {
  BUS = 'bus',
  TUBE = 'tube',
  OVERGROUND = 'overground'
}

export interface IJourney {
  _id?: any;
  user: any; // User ObjectId or populated user object
  travel_mode: TravelMode;
  route_id: string;
  start_point: string;
  end_point: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IJourneyCreate {
  travel_mode: TravelMode;
  route_id: string;
  start_point: string;
  end_point: string;
}

export interface IJourneyUpdate {
  travel_mode?: TravelMode;
  route_id?: string;
  start_point?: string;
  end_point?: string;
}

export interface IJourneyQuery {
  travel_mode?: TravelMode;
  route_id?: string;
  start_point?: string;
  end_point?: string;
  user?: string;
}

// Extend Express Request type to include journey
export interface AuthenticatedJourneyRequest extends Request {
  user?: {
    _id: string;
    [key: string]: any;
  };
} 