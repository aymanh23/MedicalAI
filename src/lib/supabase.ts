
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://pxnwcozjseafjlglmzii.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4bndjb3pqc2VhZmpsZ2xtemlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3NTkyOTgsImV4cCI6MjA2MTMzNTI5OH0.eHokIIsnScuBTpBNgHefPMg5rTYDntXDKGcOYELlQek";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
