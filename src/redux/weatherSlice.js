
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchWeather, searchCitiesApi } from "./weatherAPI";

// Search cities
export const searchCities = createAsyncThunk(
    "weather/searchCities",
    async (query, { rejectWithValue }) => {
        try {
            return await searchCitiesApi(query);
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Load weather
export const loadLocation = createAsyncThunk(
    "weather/loadLocation",
    async (location, { rejectWithValue }) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        try {
            return await fetchWeather(location, controller.signal);
        } catch (error) {
            return rejectWithValue(
                error.name === "AbortError"
                    ? "Weather request timed out. Please try again."
                    : error.message
            );
        } finally {
            clearTimeout(timeout);
        }
    }
);

const weatherSlice = createSlice({
    name: "weather",

    initialState: {
        unit: "C",
        locations: [],
        activeLocationId: null,
        searchResults: [],
        loading: false,
        searchLoading: false,
        error: null,
        searchError: null,
        lastUpdated: null
    },

    reducers: {
        toggleUnit: (state) => {
            state.unit = state.unit === "C" ? "F" : "C";
        },

        setActiveLocationId: (state, action) => {
            state.activeLocationId = action.payload;
        },

        clearSearch: (state) => {
            state.searchResults = [];
            state.searchError = null;
        }
    },

    extraReducers: (builder) => {
        builder

            // Search pending
            .addCase(searchCities.pending, (state) => {
                state.searchLoading = true;
                state.searchError = null;
            })

            // Search success
            .addCase(searchCities.fulfilled, (state, action) => {
                state.searchLoading = false;
                state.searchResults = action.payload;

                if (!action.payload.length) {
                    state.searchError = "No matching cities found.";
                }
            })

            // Search failure
            .addCase(searchCities.rejected, (state, action) => {
                state.searchLoading = false;
                state.searchResults = [];
                state.searchError = action.payload || "Unable to search cities.";
            })

            // Weather loading
            .addCase(loadLocation.pending, (state) => {
                state.loading = true;
                state.error = null;
            })

            // Weather success
            .addCase(loadLocation.fulfilled, (state, action) => {
                state.loading = false;

                const weather = action.payload;

                state.locations = [
                    weather,
                    ...state.locations.filter(
                        (item) => item.id !== weather.id
                    )
                ];

                state.activeLocationId = weather.id;
                state.lastUpdated = weather.lastUpdated;
                state.searchResults = [];
                state.error = null;
            })

            // Weather failure
            .addCase(loadLocation.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || "Unable to load weather.";
            });
    }
});

export const {
    toggleUnit,
    setActiveLocationId,
    clearSearch
} = weatherSlice.actions;

export default weatherSlice.reducer;
