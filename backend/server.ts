import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import { buildAiPrompt } from './aiPrompt';
import { buildGoogleMapsUrl } from './google';
import type { RouteOption, RoutesResponse, TransportMode } from '../frontend/src/types';
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const WEATHER_API_KEY = process.env.WEATHER_API_KEY || 'YOUR_WEATHER_KEY';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'YOUR_GOOGLE_KEY';
const AI_API_KEY = process.env.AI_API_KEY || 'YOUR_AI_KEY';
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY || 'YOUR_PIXABAY_KEY';

// 1. Resolve city to coordinates (Google Geocoding or Places)
interface GeocodeResponse {
  results: {
    geometry: {
      location: { lat: number; lng: number };
    };
  }[];
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

type NominatimResponse = NominatimResult[];

async function geocodeCity(city: string) {
  if (!city || city.trim().length === 0) {
    throw new Error("City name is empty");
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "travelngo-app" }
  });

  if (!res.ok) {
    throw new Error("Failed to fetch geocode data");
  }

  const data = (await res.json()) as NominatimResponse;

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("We couldn't find that city. Please check the spelling or try a nearby major city.");
  }

  return {
    lat: parseFloat((data[0] as NominatimResult).lat),
    lng: parseFloat((data[0] as NominatimResult).lon)
  };
}

// 2. Fetch current weather
interface WeatherResponse {
  weather: { description: string }[];
  main: { temp: number };
  clouds: { all: number };
}

async function fetchWeather(lat: number, lng: number) {
  const url =
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${WEATHER_API_KEY}`;

  const res = await fetch(url);
  const data = (await res.json()) as WeatherResponse;

  return {
    description: data.weather?.[0]?.description ?? 'unknown',
    temperature: data.main?.temp ?? 20,
    precipitationChance: data.clouds?.all ?? 0,
  };
}


// 3. Call AI agent
interface AiResponse {
  choices: {
    message: { content: string };
  }[];
}

// Source - https://stackoverflow.com/a/74787971
// Posted by Lux, modified by community. See post 'Timeline' for change history
// Retrieved 2026-04-29, License - CC BY-SA 4.0

const wait = (milliseconds: number | undefined) => new Promise(resolve => setTimeout(resolve, milliseconds));


async function callAiAgent(prompt: string): Promise<RoutesResponse> {
  
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}` // your GROQ_API_KEY
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    })
  });

  const data = (await res.json()) as AiResponse;
  // console.log(data);
  // console.log("AI RAW RESPONSE:", JSON.stringify(data, null, 2));
  if (!data.choices?.length || !data.choices[0]?.message?.content) {
    throw new Error("Our travel data provider didn't return any results. Try adjusting your time window or persona.");
  }
  
  const content = data.choices[0].message.content;
  
  // console.log("AI RESPONSE:", content);
  
  // await wait(100000); // Simulate AI processing time
  const routes = JSON.parse(content

//   const routes = JSON.parse(`{
//   "routeOptions": [
//     {
//       "routeName": "London Landmarks",
//       "personaFitSummary": "Explore iconic London landmarks and photo-ops",
//       "totalEstimatedCost": 40,
//       "totalDurationMinutes": 480,
//       "transportMode": "walking",
//       "itinerary": [
//         {
//           "name": "Buckingham Palace",
//           "address": "London SW1A 1AA",
//           "latitude": 51.503333,
//           "longitude": -0.141667,
//           "startTime": "09:00",
//           "endTime": "10:00",
//           "estimatedCost": 0,
//           "notes": "Watch the Changing of the Guard ceremony",
//           "tickets_required_online": false,
//           "reservation_recommended": false,
//           "local_tips": "Arrive early to secure a good spot"
//         },
//         {
//           "name": "The British Museum",
//           "address": "Great Russell St, London WC1B 3DG",
//           "latitude": 51.518333,
//           "longitude": -0.126667,
//           "startTime": "10:30",
//           "endTime": "12:30",
//           "estimatedCost": 10,
//           "notes": "Discover a vast collection of artifacts from around the world",
//           "tickets_required_online": false,
//           "reservation_recommended": false,
//           "local_tips": "Free admission, but some exhibitions may require a ticket"
//         },
//         {
//           "name": "The Shard",
//           "address": "32 London Bridge St, London SE1 9SG",
//           "latitude": 51.504444,
//           "longitude": -0.086667,
//           "startTime": "14:00",
//           "endTime": "16:00",
//           "estimatedCost": 30,
//           "notes": "Enjoy panoramic views of the city from the viewing platform",
//           "tickets_required_online": true,
//           "reservation_recommended": true,
//           "local_tips": "Book tickets in advance to avoid long wait times"
//         }
//       ]
//     },
//     {
//       "routeName": "London Parks and Gardens",
//       "personaFitSummary": "Relax in London's beautiful parks and gardens",
//       "totalEstimatedCost": 20,
//       "totalDurationMinutes": 420,
//       "transportMode": "transit",
//       "itinerary": [
//         {
//           "name": "Hyde Park",
//           "address": "London W2 2UH",
//           "latitude": 51.507222,
//           "longitude": -0.166667,
//           "startTime": "09:00",
//           "endTime": "10:30",
//           "estimatedCost": 0,
//           "notes": "Take a stroll around the Serpentine Lake",
//           "tickets_required_online": false,
//           "reservation_recommended": false,
//           "local_tips": "Rent a boat and enjoy the scenery"
//         },
//         {
//           "name": "Kew Gardens",
//           "address": "Royal Botanic Gardens, Kew, Richmond TW9 3AB",
//           "latitude": 51.466667,
//           "longitude": -0.283333,
//           "startTime": "11:30",
//           "endTime": "13:30",
//           "estimatedCost": 10,
//           "notes": "Explore the diverse plant species and glasshouses",
//           "tickets_required_online": true,
//           "reservation_recommended": false,
//           "local_tips": "Check the website for special exhibitions and events"
//         },
//         {
//           "name": "Regent's Park",
//           "address": "London NW1 4NR",
//           "latitude": 51.529167,
//           "longitude": -0.153333,
//           "startTime": "14:30",
//           "endTime": "16:00",
//           "estimatedCost": 10,
//           "notes": "Visit the London Zoo and enjoy the gardens",
//           "tickets_required_online": true,
//           "reservation_recommended": true,
//           "local_tips": "Book tickets in advance to avoid long wait times"
//         }
//       ]
//     },
//     {
//       "routeName": "London Food Tour",
//       "personaFitSummary": "Sample the best of London's food scene",
//       "totalEstimatedCost": 50,
//       "totalDurationMinutes": 480,
//       "transportMode": "walking",
//       "itinerary": [
//         {
//           "name": "Borough Market",
//           "address": "8 Southwark St, London SE1 1TL",
//           "latitude": 51.504167,
//           "longitude": -0.089167,
//           "startTime": "09:00",
//           "endTime": "10:30",
//           "estimatedCost": 10,
//           "notes": "Try artisanal foods and drinks from around the world",
//           "tickets_required_online": false,
//           "reservation_recommended": false,
//           "local_tips": "Come hungry and be prepared to try new things"
//         },
//         {
//           "name": "Brick Lane Curry House",
//           "address": "79 Brick Lane, London E1 6QL",
//           "latitude": 51.522222,
//           "longitude": -0.071667,
//           "startTime": "11:30",
//           "endTime": "13:00",
//           "estimatedCost": 15,
//           "notes": "Enjoy a delicious Indian curry",
//           "tickets_required_online": false,
//           "reservation_recommended": true,
//           "local_tips": "Try the popular chicken tikka masala"
//         },
//         {
//           "name": "Dishoom",
//           "address": "22 Kingly St, London W1B 5QP",
//           "latitude": 51.513056,
//           "longitude": -0.138333,
//           "startTime": "14:00",
//           "endTime": "16:00",
//           "estimatedCost": 25,
//           "notes": "Experience Indian cuisine in a unique setting",
//           "tickets_required_online": false,
//           "reservation_recommended": true,
//           "local_tips": "Book a table in advance to avoid long wait times"
//         }
//       ]
//     },
//     {
//       "routeName": "London Museums",
//       "personaFitSummary": "Discover London's rich history and culture",
//       "totalEstimatedCost": 30,
//       "totalDurationMinutes": 480,
//       "transportMode": "transit",
//       "itinerary": [
//         {
//           "name": "The National Gallery",
//           "address": "Trafalgar Square, London WC2N 5DN",
//           "latitude": 51.508333,
//           "longitude": -0.128333,
//           "startTime": "09:00",
//           "endTime": "10:30",
//           "estimatedCost": 0,
//           "notes": "Explore a vast collection of Western European art",
//           "tickets_required_online": false,
//           "reservation_recommended": false,
//           "local_tips": "Free admission, but some exhibitions may require a ticket"
//         },
//         {
//           "name": "The Natural History Museum",
//           "address": "Cromwell Rd, London SW7 5BD",
//           "latitude": 51.496389,
//           "longitude": -0.176667,
//           "startTime": "11:30",
//           "endTime": "13:30",
//           "estimatedCost": 10,
//           "notes": "Discover the wonders of the natural world",
//           "tickets_required_online": false,
//           "reservation_recommended": false,
//           "local_tips": "Check the website for special exhibitions and events"
//         },
//         {
//           "name": "The Tate Modern",
//           "address": "Bankside, London SE1 9TG",
//           "latitude": 51.507778,
//           "longitude": -0.099167,
//           "startTime": "14:30",
//           "endTime": "16:30",
//           "estimatedCost": 20,
//           "notes": "Explore an extensive collection of modern and contemporary art",
//           "tickets_required_online": false,
//           "reservation_recommended": false,
//           "local_tips": "Free admission, but some exhibitions may require a ticket"
//         }
//       ]
//     }
//   ],
//   "cityFacts": [
//     {
//       "title": "London's Hidden Tunnels",
//       "description": "London has a network of hidden tunnels and passageways that crisscross beneath the city. These tunnels were built for various purposes, including as air raid shelters during World War II and as secret escape routes for royalty. Today, some of these tunnels are open to the public for guided tours.",
//       "icon": "🚂"
//     },
//     {
//       "title": "The London Stone",
//       "description": "The London Stone is a ancient stone that has been embedded in the wall of a building on Cannon Street since the 12th century. According to legend, the stone has magical powers and is the heart of the city. It is a popular spot for tourists and locals alike.",
//       "icon": "🔥"
//     },
//     {
//       "title": "The Sky Garden",
//       "description": "The Sky Garden is a free public garden on the 35th floor of the Walkie-Talkie building. The garden offers stunning views of the city and is home to over 500 species of plants. It is a peaceful oasis in the midst of the bustling city.",
//       "icon": "🌴"
//     },
//     {
//       "title": "The Street Performers of Covent Garden",
//       "description": "Covent Garden has a long history of street performers, dating back to the 17th century. Today, the area is still home to a variety of talented performers, including musicians, jugglers, and living statues. It is a great place to visit for entertainment and people-watching.",
//       "icon": "🎭"
//     },
//     {
//       "title": "The Ceremony of the Keys",
//       "description": "The Ceremony of the Keys is a 700-year-old tradition that takes place every night at the Tower of London. The ceremony involves the Chief Yeoman Warder locking up the tower and handing over the keys to the Resident Governor. It is a unique and fascinating glimpse into the city's history and traditions.",
//       "icon": "🔑"
//     }
//   ]
// }`
  ) as RoutesResponse;
  console.log(routes);
  const routePromises = routes.routeOptions.map(async (r) => {
    try {
      // Determine a search term (fallback to route name if itinerary is empty)
      const searchTerm = r.itinerary[0]?.name + " " + r.routeName;
      
      // Actually wait for the Pixabay API to return
      r.imageUrl = await getPixabayImage(searchTerm);
      
      // While we're here, build the Google Maps URL
      r.googleMapsUrl = buildGoogleMapsUrl(r);
      
      return r;
    } catch (error) {
      console.error(`Error processing route ${r.routeName}:`, error);
      r.imageUrl = "https://via.placeholder.com/400x300?text=Error+Loading+Image";
      return r;
    }
  });

  // 2. Wait for EVERY route to finish its async work
  await Promise.all(routePromises);

  // 3. Now it is safe to return the routes
  // console.log("ALL ROUTES PROCESSED:", routes);
  return routes;
}

interface PixabayResponse {
  hits: {
    webformatURL: string;
  }[];
}

async function getPixabayImage(searchQuery: string | undefined): Promise<string> {
    // 1. Handle undefined or empty strings immediately
    if (!searchQuery || searchQuery.trim() === "") {
        return "https://via.placeholder.com/400x300?text=No+Search+Term";
    }

    const url = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(searchQuery)}&image_type=photo&per_page=3&orientation=horizontal&safesearch=true`;
    
    try {
        const response = await fetch(url);
        // 2. Cast the response to our interface
        const data = (await response.json()) as PixabayResponse;
        
        return data.hits.length > 0 && data.hits[0]
            ? data.hits[0].webformatURL 
            : "https://via.placeholder.com/400x300?text=No+Image+Found";
    } catch (error) {
        console.error("Pixabay Fetch Error:", error);
        return "https://via.placeholder.com/400x300?text=Error+Loading+Image";
    }
}


app.post('/api/generate-routes', async (req, res) => {
  try {
    const {
      city,
      timeStart,
      timeEnd,
      persona,
      budget,
      groupSize,
      transport,
    }: {
      city: string;
      timeStart: string;
      timeEnd: string;
      persona: string;
      budget: string;
      groupSize: number;
      transport: TransportMode;
    } = req.body;

    const { lat, lng } = await geocodeCity(city);
    const weather = await fetchWeather(lat, lng);

    const prompt = buildAiPrompt({
      city,
      lat,
      lng,
      timeStart,
      timeEnd,
      persona,
      budget,
      groupSize,
      transport,
      weather,
    });

    const routes = await callAiAgent(prompt);

    res.json({ routes });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate routes', details: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
