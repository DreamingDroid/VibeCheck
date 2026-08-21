"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface City {
  id: number;
  name: string;
}

export interface VibeEvent {
  id: string;
  category: string;
  title: string;
  description: string;
  date_time: string;
  location: string;
  organizer_email: string;
  rsvp_count?: number;
  google_maps_link?: string;
  city?: string;
  participant_limit?: number;
  is_paid?: boolean;
  status?: string;
}

interface CityContextType {
  currentCity: string;
  setCity: (city: string) => void;
  supportedCities: City[];
  isLoading: boolean;
  isLoadingLocation: boolean;
  events: VibeEvent[];
  isLoadingEvents: boolean;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  activeCategories: string[];
}

const CityContext = createContext<CityContextType | undefined>(undefined);

export function CityProvider({ children }: { children: ReactNode }) {
  const [currentCity, setCurrentCity] = useState<string>("Vizag");
  const [supportedCities, setSupportedCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(true);
  const [events, setEvents] = useState<VibeEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("The Latest");

  // Fetch cities from DB
  const fetchCities = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/cities`);
      const data = await res.json();
      if (data.success) {
        setSupportedCities(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch cities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEvents = async (city: string) => {
    setIsLoadingEvents(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const url = new URL(`${baseUrl}/api/events`);
      if (city) url.searchParams.append("city", city);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setEvents(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchCities();

    const savedCity = localStorage.getItem("vibecheck_city");
    if (savedCity) {
      setCurrentCity(savedCity);
      setIsLoadingLocation(false);
    } else {
      // Attempt Geolocation
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            setIsLoadingLocation(false);
          },
          (error) => {
            console.error("Geolocation error:", error);
            setIsLoadingLocation(false);
          },
          { timeout: 10000 }
        );
      } else {
        setIsLoadingLocation(false);
      }
    }
  }, []);

  useEffect(() => {
    if (currentCity) {
      fetchEvents(currentCity);
      setSelectedCategory("The Latest");
    }
  }, [currentCity]);

  const setCity = (city: string) => {
    setCurrentCity(city);
    localStorage.setItem("vibecheck_city", city);
  };

  // Get active categories dynamically from current events list
  const activeCategories = Array.from(
    new Set(events.map((e) => e.category))
  ).filter(Boolean);

  return (
    <CityContext.Provider
      value={{
        currentCity,
        setCity,
        supportedCities,
        isLoading,
        isLoadingLocation,
        events,
        isLoadingEvents,
        selectedCategory,
        setSelectedCategory,
        activeCategories,
      }}
    >
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const context = useContext(CityContext);
  if (context === undefined) {
    throw new Error("useCity must be used within a CityProvider");
  }
  return context;
}
