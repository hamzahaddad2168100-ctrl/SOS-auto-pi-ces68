import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://cyuretfxmrjnewqahbhy.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5dXJldGZ4bXJqbmV3cWFoYmh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MDk1MDIsImV4cCI6MjEwMzE4NTUwMn0.PSq1KQSSgWzUUPn7Wr4rIU_ICrj-o_q8EVLp8cy87DQ";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
