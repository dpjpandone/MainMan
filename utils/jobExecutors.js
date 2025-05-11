import { uploadImageToSupabase } from './imageUtils';
import { uploadFileToSupabase } from './fileUtils';
import { SUPABASE_URL, SUPABASE_BUCKET, SUPABASE_KEY, supabase } from './supaBaseConfig';
import { addInAppLog } from '../utils/InAppLogger';

export const jobExecutors = {
  uploadProcedureImage: async (payload) => {
    addInAppLog(`[EXECUTOR] Starting image upload: ${payload.localUri}`);
    try {
      await uploadImageToSupabase(payload);
      addInAppLog(`[EXECUTOR] Image uploaded successfully: ${payload.localUri}`);
    } catch (err) {
      addInAppLog(`[EXECUTOR] Image upload failed: ${err.message}`);
      throw err;
    }
  },

  uploadProcedureFile: async (payload) => {
    addInAppLog(`[EXECUTOR] Starting file upload: ${payload.localUri}`);
    try {
      await uploadFileToSupabase(payload);
      addInAppLog(`[EXECUTOR] File uploaded successfully: ${payload.localUri}`);
    } catch (err) {
      addInAppLog(`[EXECUTOR] File upload failed: ${err.message}`);
      throw err;
    }
  },

  updateProcedureSettings: async ({ procedureId, intervalDays, selectedDate, userId }) => {
    addInAppLog(`[EXECUTOR] Updating procedure settings: ${procedureId}`);
    const body = {
      interval_days: parseInt(intervalDays),
      last_completed: selectedDate ? new Date(selectedDate).toISOString() : null,
      completed_by: selectedDate ? userId : null,
    };

    const { error } = await supabase
      .from('procedures')
      .update(body)
      .eq('id', procedureId);

    if (error) {
      addInAppLog(`[EXECUTOR] Failed to update settings: ${error.message}`);
      throw error;
    }

    addInAppLog(`[EXECUTOR] Procedure settings updated: ${procedureId}`);
  },

  markProcedureComplete: async ({ procedureId, intervalDays, userId }) => {
    addInAppLog(`[EXECUTOR] Marking procedure complete: ${procedureId}`);

    const now = new Date();
    const dueDate = new Date();
    dueDate.setDate(now.getDate() + parseInt(intervalDays || 0));

    const { error } = await supabase
      .from('procedures')
      .update({
        last_completed: now.toISOString(),
        due_date: dueDate.toISOString(),
        completed_by: userId,
      })
      .eq('id', procedureId);

    if (error) {
      addInAppLog(`[EXECUTOR] Failed to mark complete: ${error.message}`);
      throw error;
    }

    addInAppLog(`[EXECUTOR] Procedure marked complete: ${procedureId}`);
  },

  saveProcedureDescription: async ({ procedureId, description, imageUrls, fileUrls, fileLabels }) => {
    addInAppLog(`[EXECUTOR] Saving description for: ${procedureId}`);

    const { error } = await supabase
      .from('procedures')
      .update({
        description,
        image_urls: imageUrls,
        file_urls: fileUrls,
        file_labels: fileLabels,
      })
      .eq('id', procedureId);

    if (error) {
      addInAppLog(`[EXECUTOR] Failed to save description: ${error.message}`);
      throw error;
    }

    addInAppLog(`[EXECUTOR] Description saved for procedure: ${procedureId}`);
  },

  addProcedure: async ({ machineId, name, description, interval, startingDate, companyId }) => {
    addInAppLog(`[EXECUTOR] Attempting to add procedure: ${name}`);
    addInAppLog(`[EXECUTOR] Payload = ${JSON.stringify({
      machineId,
      name,
      description,
      interval,
      startingDate,
      companyId,
    })}`);

    try {
      const { error } = await supabase
        .from('procedures')
        .insert([{
          machine_id: machineId,
          procedure_name: name,
          description,
          interval_days: parseInt(interval),
          last_completed: new Date(startingDate).toISOString(),
          due_date: null,
          image_urls: [],
          company_id: companyId,
        }]);

      if (error) {
        if (error.message.includes('duplicate key value')) {
          addInAppLog(`[EXECUTOR] Duplicate detected. Procedure already exists: ${name}`);
          return 'duplicate'; // return special flag for duplicates
        }

        addInAppLog(`[EXECUTOR] Failed to add procedure: ${error.message}`);
        throw error;
      }

      addInAppLog(`[EXECUTOR] Successfully added procedure: ${name}`);
    } catch (err) {
      addInAppLog(`[EXECUTOR] Unexpected error: ${err.message || err}`);
      throw err;
    }
  },
};
