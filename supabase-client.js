import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://weesblnngsrjzvamrfyv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZXNibG5uZ3Nyanp2YW1yZnl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3OTY0MzMsImV4cCI6MjA5NzM3MjQzM30.ZzhyiFQrKhPftQp0uCp1LlRmGH39S_Zmddkpxdiamkc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Auth Functions ---
export async function supabaseLogin(email) {
  return await supabase.auth.signInWithOtp({ 
    email,
    options: {
      shouldCreateUser: true
    }
  });
}

export async function supabaseVerifyOtp(email, token) {
  return await supabase.auth.verifyOtp({ email, token, type: 'email' });
}

export async function supabaseLogout() {
  return await supabase.auth.signOut();
}

export async function supabaseGetSession() {
  return await supabase.auth.getSession();
}

// --- Access Master Functions ---
export async function fetchAccessRecord(email) {
  const { data, error } = await supabase.from('access_master').select('*').eq('email', email).single();
  if (error && error.code !== 'PGRST116') console.error('fetchAccessRecord error:', error);
  return data;
}

export async function fetchAllUsers() {
  const { data, error } = await supabase.from('access_master').select('*').order('created_at', { ascending: false });
  if (error) console.error('fetchAllUsers error:', error);
  return data || [];
}

export async function addUser(userObj) {
  return await supabase.from('access_master').insert(userObj);
}

export async function removeUser(email) {
  return await supabase.from('access_master').delete().eq('email', email);
}

// --- District Entries Functions ---
export async function fetchEntry(district) {
  const { data, error } = await supabase.from('district_entries').select('*').eq('district', district).single();
  if (error && error.code !== 'PGRST116') console.error('fetchEntry error:', error);
  return data;
}

export async function fetchAllEntries() {
  const { data, error } = await supabase.from('district_entries').select('*');
  if (error) console.error('fetchAllEntries error:', error);
  return data || [];
}

export async function upsertEntry(district, values) {
  return await supabase.from('district_entries').update({ values, status: 'draft' }).eq('district', district);
}

export async function submitEntry(district, values, submittedBy) {
  return await supabase.from('district_entries').update({
    values,
    status: 'submitted',
    submitted_by: submittedBy,
    submitted_at: new Date().toISOString()
  }).eq('district', district);
}

export async function unlockEntry(district) {
  return await supabase.from('district_entries').update({
    status: 'draft',
    submitted_by: null,
    submitted_at: null
  }).eq('district', district);
}

// Expose to window fallback just in case
window.supabase = supabase;
window.supabaseLogin = supabaseLogin;
window.supabaseVerifyOtp = supabaseVerifyOtp;
window.supabaseLogout = supabaseLogout;
window.supabaseGetSession = supabaseGetSession;
window.fetchAccessRecord = fetchAccessRecord;
window.fetchAllUsers = fetchAllUsers;
window.addUser = addUser;
window.removeUser = removeUser;
window.fetchEntry = fetchEntry;
window.fetchAllEntries = fetchAllEntries;
window.upsertEntry = upsertEntry;
window.submitEntry = submitEntry;
window.unlockEntry = unlockEntry;
