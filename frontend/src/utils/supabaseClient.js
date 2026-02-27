import { createClient } from '@supabase/supabase-js';

// DIRECT STRINGS ONLY. Do not use 'process.env' anywhere here.
const supabaseUrl = "https://tuwalmwezlrwfmnmntdm.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1d2FsbXdlemxyd2Ztbm1udGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MzY5MDksImV4cCI6MjA4NjMxMjkwOX0.6kjeTKSHJPBQpFQpLjp9fF-OJgdOQ9z8rOxX6hWA5nY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);