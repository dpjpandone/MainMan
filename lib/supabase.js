// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pzmjrigansqyyfgruiwi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bWpyaWdhbnNxeXlmZ3J1aXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyNjEzNDUsImV4cCI6MjA2MDgzNzM0NX0.7JP-4K6-LRI_Tf5CT1BCiHr2_Kr8jqRtqvmtj1l56MI';

export const supabase = createClient(supabaseUrl, supabaseKey);
