"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface City {
  id: number;
  name: string;
}

interface CityContextType {
  currentCity: string;
  setCity: (city: string) => void;
  supportedCities: City[];
  isLoading: boolean;
  isLoadingLocation: boolean;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

export function CityProvider({ children }: { children: ReactNode }) {
  const [currentCity, setCurrentCity] = useState<string>("Vizag");
  const [supportedCities, setSupportedCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(true);

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

  const setCity = (city: string) => {
    setCurrentCity(city);
    localStorage.setItem("vibecheck_city", city);
  };

  return (
    <CityContext.Provider value={{ currentCity, setCity, supportedCities, isLoading, isLoadingLocation }}>
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
