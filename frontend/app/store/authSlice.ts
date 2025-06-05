import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  token: string | null;
  loading: boolean;
}

const initialState: AuthState = {
  token: null,
  loading: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setToken(state, action: PayloadAction<string | null>) {
      state.token = action.payload;
      state.loading = false;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    logout: (state) => {
      state.token = null;
      state.loading = false;
      // ...clear other user state if needed
    },
  },
});

export const { setToken, setLoading, logout } = authSlice.actions;
export default authSlice.reducer;