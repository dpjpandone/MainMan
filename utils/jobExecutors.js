// utils/jobExecutors.js
// NOTE: This is a temporary mock for dev testing. Replace with real upload logic.
import { uploadImageToSupabase } from './imageUtils';

export const jobExecutors = {
  uploadProcedureImage: async (payload) => {
    //For testing UI
    //console.log('[EXECUTOR] Pretending to upload image:', payload.uri);
    //throw new Error('Simulated upload failure');
    console.log('[EXECUTOR] Uploading image via Supabase:', payload.uri);
    await uploadImageToSupabase(payload);
    console.log('[EXECUTOR] Upload complete');
  }
};
  