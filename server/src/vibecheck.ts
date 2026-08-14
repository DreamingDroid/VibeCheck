import { Request, Response } from 'express';
import { Pool } from 'pg';
import { getChatModel } from './rag';

interface CityInfo {
  lat: number;
  lon: number;
  countryCode: string;
}

const CITY_MAP: Record<string, CityInfo> = {
  vizag: { lat: 17.6868, lon: 83.2185, countryCode: 'IN' },
  visakhapatnam: { lat: 17.6868, lon: 83.2185, countryCode: 'IN' },
  bangalore: { lat: 12.9716, lon: 77.5946, countryCode: 'IN' },
  london: { lat: 51.5074, lon: -0.1278, countryCode: 'GB' },
};

export async function vibeCheckHandler(req: Request, res: Response, pool: Pool) {
  const { title, date_time, city, location, venue_type } = req.body;

  if (!title || !date_time) {
    return res.status(400).json({ success: false, error: 'Missing title or date_time' });
  }

  try {
    const normalizedCity = typeof city === 'string' ? city.toLowerCase().trim() : '';
    const cityInfo = CITY_MAP[normalizedCity] || CITY_MAP['vizag']; // default to Vizag/IN

    const eventDate = new Date(date_time);
    const dateStr = eventDate.toISOString().split('T')[0];
    const year = eventDate.getFullYear();

    // 1. Fetch Weather Data (Forecast or Historical Archive)
    const today = new Date();
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let weatherDesc = '';
    try {
      if (diffDays >= 0 && diffDays <= 16) {
        // Fetch 16-day forecast
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${cityInfo.lat}&longitude=${cityInfo.lon}&daily=temperature_2m_max,temperature_2m_min,rain_sum,showers_sum&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;
        const weatherRes = await fetch(weatherUrl);
        const weatherData = (await weatherRes.json()) as any;
        if (weatherData.daily && weatherData.daily.time && weatherData.daily.time.length > 0) {
          const maxTemp = weatherData.daily.temperature_2m_max[0];
          const minTemp = weatherData.daily.temperature_2m_min[0];
          const rain = (weatherData.daily.rain_sum?.[0] || 0) + (weatherData.daily.showers_sum?.[0] || 0);
          weatherDesc = `Weather forecast for ${dateStr} at ${city}: Max Temp ${maxTemp}°C, Min Temp ${minTemp}°C, Expected Precipitation: ${rain}mm.`;
        } else {
          weatherDesc = `No forecast available for ${dateStr}.`;
        }
      } else {
        // Fetch Climatology: Same day last year
        const lastYearDate = new Date(eventDate);
        lastYearDate.setFullYear(eventDate.getFullYear() - 1);
        const lyDateStr = lastYearDate.toISOString().split('T')[0];

        const weatherUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${cityInfo.lat}&longitude=${cityInfo.lon}&start_date=${lyDateStr}&end_date=${lyDateStr}&daily=temperature_2m_max,temperature_2m_min,rain_sum&timezone=auto`;
        const weatherRes = await fetch(weatherUrl);
        const weatherData = (await weatherRes.json()) as any;
        if (weatherData.daily && weatherData.daily.time && weatherData.daily.time.length > 0) {
          const maxTemp = weatherData.daily.temperature_2m_max[0];
          const minTemp = weatherData.daily.temperature_2m_min[0];
          const rain = weatherData.daily.rain_sum?.[0] || 0;
          weatherDesc = `Weather is too far in the future. Typical weather on this day last year (${lyDateStr}): Max Temp ${maxTemp}°C, Min Temp ${minTemp}°C, Precipitation: ${rain}mm.`;
        } else {
          weatherDesc = `No historical climate data available for this month.`;
        }
      }
    } catch (e: any) {
      console.error('Weather fetch error:', e);
      weatherDesc = 'Weather forecast services currently unavailable.';
    }

    // 2. Fetch Holiday Data
    let holidayDesc = 'No public holiday scheduled.';
    try {
      const holidayUrl = `https://date.nager.at/api/v3/PublicHolidays/${year}/${cityInfo.countryCode}`;
      const holidayRes = await fetch(holidayUrl);
      const holidays = await holidayRes.json();
      if (Array.isArray(holidays)) {
        const match = holidays.find((h: any) => h.date === dateStr);
        if (match) {
          holidayDesc = `Public Holiday: Yes, it is "${match.localName}" / "${match.name}".`;
        }
      }
    } catch (e: any) {
      console.error('Holiday fetch error:', e);
      holidayDesc = 'Holiday status services currently unavailable.';
    }

    // 3. AI Insights Compilation
    const llm = getChatModel();
    const systemPrompt = `You are VibeCheck AI, an expert event scheduler.
Provide a concise 2-3 sentence assessment advising the event organizer on scheduling conditions for the following proposed event.

Event Details:
- Title: ${title}
- Date: ${eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Venue: ${location || 'TBA'}
- City: ${city || 'Vizag'}
- Venue Type: ${venue_type || 'Indoor'}

Environmental Context:
- Weather Context: ${weatherDesc}
- Holiday Context: ${holidayDesc}

Advising rules:
1. If the venue is 'Outdoor' and there is significant rain/precipitation forecast, warn them and suggest indoor backup or tents.
2. If it is a public holiday, mention potential holiday traffic or highlight that audience availability may be higher/different, suggesting optimal logistics.
3. Keep it brief, conversational, and direct (max 3 sentences). Do not use introductory boilerplate.`;

    const response = await llm.invoke([['system', systemPrompt]]);
    const advice = (response.content as string).trim();

    res.json({
      success: true,
      weather: weatherDesc,
      holiday: holidayDesc,
      advice
    });
  } catch (error: any) {
    console.error('VibeCheck endpoint error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
