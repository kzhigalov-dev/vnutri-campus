import {env} from 'cloudflare:workers';
import {handleBookingRequest} from '../../../server/booking-service.js';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleBookingRequest(request,env);}
export async function POST(request:Request){return handleBookingRequest(request,env);}
