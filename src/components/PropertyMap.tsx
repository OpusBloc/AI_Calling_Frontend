"use client";

import { useEffect, useRef, useState } from "react";
import { FiSearch, FiLoader } from "react-icons/fi";

import {
  forwardRef,
  useImperativeHandle,
} from "react";

interface MapLocationData {
  address?: string;
  buildingName?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
}

export interface PropertyMapRef {
  locateAddress: (address: string) => void;
}


interface Props {
  onLocationSelect: (data: MapLocationData) => void;
  /**
   * Existing coordinates to open on (e.g. a saved draft). The map centers here
   * and drops the marker instead of using the default center. Purely display —
   * seeding the pin never fires `onLocationSelect`, so it cannot overwrite the
   * caller's saved values.
   */
  initialLocation?: { lat: number; lng: number } | null;
}


const PropertyMap = forwardRef<PropertyMapRef, Props>(
  ({ onLocationSelect, initialLocation }, ref) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

 const mapInstance = useRef<google.maps.Map | null>(null);
const markerRef = useRef<google.maps.Marker | null>(null);
const geocoderRef = useRef<google.maps.Geocoder | null>(null);


  const [loadingMap, setLoadingMap] = useState(true);
  const [locating, setLocating] = useState(false);

  // Read inside the init closure (which runs once) without making the map
  // re-initialise every time the prop identity changes.
  const initialLocationRef = useRef(initialLocation);
  initialLocationRef.current = initialLocation;

  useEffect(() => {
    const initMap = () => {
  if (!window.google || !window.google.maps) return;

      const saved = initialLocationRef.current;
      const hasSaved =
        !!saved && Number.isFinite(saved.lat) && Number.isFinite(saved.lng);

      const center = hasSaved
        ? { lat: Number(saved!.lat), lng: Number(saved!.lng) }
        : { lat: 17.385, lng: 78.4867 };
      const map = new google.maps.Map(mapRef.current!, {
        center,
        zoom: hasSaved ? 16 : 13,
      });



      const marker = new google.maps.Marker({
        map,
        draggable: true,
        // Show the saved pin straight away; without a position the marker is
        // invisible and the draft's location looks lost.
        ...(hasSaved ? { position: center } : {}),
      });

      const geocoder = new google.maps.Geocoder();

      setLoadingMap(false);
      mapInstance.current = map;
markerRef.current = marker;
geocoderRef.current = geocoder;


      const updateLocation = (lat: number, lng: number) => {
  geocoder.geocode({ location: { lat, lng } }).then((res) => {
    const result = res.results[0];
    if (!result) return;

    const components = result.address_components;

    const get = (type: string) =>
      components.find((c) => c.types.includes(type))?.long_name || "";

    onLocationSelect({
      address: result.formatted_address,

      buildingName: get("premise") || get("establishment") || "",
      city: get("locality"),
      district: get("administrative_area_level_2"),
      state: get("administrative_area_level_1"),
      country: get("country"),
      pincode: get("postal_code"),

      lat,
      lng,
    });
  });
};








      /* click */
      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
marker.setPosition(e.latLng);
updateLocation(e.latLng.lat(), e.latLng.lng());
      });

      /* drag */
      marker.addListener("dragend", () => {
        const pos = marker.getPosition();
        if (!pos) return;
        updateLocation(pos.lat(), pos.lng());
      });

      /* search */
      const autocomplete = new google.maps.places.Autocomplete(
        inputRef.current!
      );

      autocomplete.bindTo("bounds", map);

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry?.location) return;

        map.panTo(place.geometry.location);
        map.setZoom(16);
        marker.setPosition(place.geometry.location);

        updateLocation(
  place.geometry.location.lat(),
  place.geometry.location.lng()
);
      });

      /* current location button */
      const btn = document.createElement("button");

      // A bare <button> defaults to type="submit". This control is appended
      // into the map container, which on the fractionalization page lives
      // inside the listing <form> - so without this the click submitted the
      // whole form instead of locating the user.
      btn.type = "button";

      btn.className =
        "bg-white dark:bg-[#0b1220] text-gray-800 dark:text-gray-200 shadow-md px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center gap-2";

      btn.innerHTML = `
  <span style="display:flex;align-items:center;gap:6px">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      viewBox="0 0 24 24"
    >
      <path d="M21 10c0 6-9 13-9 13S3 16 3 10a9 9 0 1 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
    My Location
  </span>
`;


      map.controls[google.maps.ControlPosition.TOP_RIGHT].push(btn);

      btn.onclick = (event) => {
        event.preventDefault();
        setLocating(true);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            };

            map.panTo(loc);
            map.setZoom(16);
            marker.setPosition(loc);
            updateLocation(loc.lat, loc.lng);

            setLocating(false);
          },
          () => setLocating(false)
        );
      };
    };

    /* load script once */
  const existingScript = document.querySelector(
  'script[src*="maps.googleapis.com"]'
);

if (!existingScript) {
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = initMap;

  document.head.appendChild(script);
} else {
  if (window.google?.maps) {
    initMap();
  } else {
    existingScript.addEventListener("load", initMap);
  }
}
  }, []);

  // A draft usually loads AFTER the map has initialised, so re-seed the pin
  // whenever the saved coordinates arrive or change. Does not notify the
  // caller — this only reflects what is already stored.
  const appliedLocationRef = useRef<string>("");
  useEffect(() => {
    const map = mapInstance.current;
    const marker = markerRef.current;
    if (!map || !marker || !initialLocation) return;

    const { lat, lng } = initialLocation;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const key = `${lat},${lng}`;
    if (appliedLocationRef.current === key) return;
    appliedLocationRef.current = key;

    const position = { lat: Number(lat), lng: Number(lng) };
    map.panTo(position);
    map.setZoom(16);
    marker.setPosition(position);
  }, [initialLocation, loadingMap]);

  useImperativeHandle(ref, () => ({
  locateAddress: (address: string) => {
    if (!address || !geocoderRef.current) return;

    geocoderRef.current
      .geocode({ address })
      .then((res: google.maps.GeocoderResponse) => {
        if (!res.results.length) {
          alert(
            "Location not found. Please select manually or use current location."
          );
          return;
        }

        const loc = res.results[0].geometry.location;

        mapInstance.current?.panTo(loc);
mapInstance.current?.setZoom(16);
markerRef.current?.setPosition(loc);


        onLocationSelect({
          address: res.results[0].formatted_address,
          lat: loc.lat(),
          lng: loc.lng(),
        });
      });
  },
}));


  return (
    <div className="space-y-4">

      {/* ================= SEARCH BAR ================= */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-3 text-gray-400 dark:text-gray-500 text-lg" />

        <input
          ref={inputRef}
          placeholder="Search address or place..."
          // Enter is how you pick a Places suggestion; letting it bubble would
          // submit the enclosing form instead of resolving the address.
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          className="
            w-full
            pl-10 pr-4 py-3
            border border-gray-300 dark:border-gray-700
            rounded-xl
            shadow-sm
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            outline-none
            text-sm
            bg-white dark:bg-[#0b1220]
            text-gray-900 dark:text-gray-100
          "
        />
      </div>

      {/* ================= MAP ================= */}
      <div className="relative">

        {/* Map loader */}
        {loadingMap && (
          <div className="absolute inset-0 bg-gray-100 dark:bg-[#0b1220] rounded-xl flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
            <FiLoader className="animate-spin" />
            Loading map...
          </div>
        )}

        {/* Location loader */}
        {locating && (
          <div className="absolute top-3 left-3 z-10 bg-white dark:bg-[#0b1220] px-3 py-1.5 rounded-lg shadow text-xs flex justify-center items-center gap-2 text-gray-700 dark:text-gray-200">
            <FiLoader className="animate-spin text-blue-500 dark:text-blue-400" />
            Detecting location...
          </div>
        )}

        <div
          ref={mapRef}
          className="
            w-full
            h-[380px]
            rounded-xl
            border border-gray-200 dark:border-gray-700
            shadow-md
            overflow-hidden
            bg-white dark:bg-[#0b1220]
          "
        />
      </div>
    </div>
  );
})
PropertyMap.displayName = "PropertyMap";

export default PropertyMap;

