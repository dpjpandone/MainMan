import { uploadImageToSupabase } from './imageUtils';
import { uploadFileToSupabase } from './fileUtils';
import { SUPABASE_URL, SUPABASE_BUCKET, SUPABASE_KEY, supabase } from './supaBaseConfig';
import { addInAppLog } from '../utils/InAppLogger';

export const jobExecutors = {
uploadProcedureImage: async ({
  procedureId,
  localUri,
  fileName,
  setImageUrls,
  imageUrls,
  captions,        // ✅ NEW
  setCaptions,     // ✅ NEW
}) => {
  addInAppLog(`[EXECUTOR] Starting image upload: ${localUri}`);
  try {
await uploadImageToSupabase({
  procedureId,
  localUri,
  fileName,
  imageUrls,
  setImageUrls,
  captions,      // ✅ NEW
  setCaptions,   // ✅ NEW
});
    addInAppLog(`[EXECUTOR] Image uploaded successfully: ${localUri}`);
  } catch (err) {
    addInAppLog(`[EXECUTOR] Image upload failed: ${err.message}`);
    throw err;
  }
},

uploadProcedureFile: async ({
  localUri,
  label,
  procedureId,
  fileName,
  setFileUrls,
  fileUrls,
  setFileLabels,
  fileLabels,
}) => {
  addInAppLog(`[EXECUTOR] Starting file upload: ${localUri}`);
  try {
    await uploadFileToSupabase({
      localUri,
      label,
      procedureId,
      fileName,
      setFileUrls,
      fileUrls,
      setFileLabels,
      fileLabels,
    });
    addInAppLog(`[EXECUTOR] File uploaded successfully: ${localUri}`);
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

saveProcedureDescription: async ({
  procedureId,
  description,
  imageUrls = [],
  fileUrls = [],
  fileLabels = [],
  captions = { image: {}, file: {} },
}) => {
  addInAppLog(`[EXECUTOR] Saving procedure metadata for: ${procedureId}`);

  // Re-fetch synced attachment URLs to avoid saving stale file:// URIs
const { data: procData, error: fetchError } = await supabase
  .from('procedures')
  .select('image_urls, file_urls, file_labels, captions')
  .eq('id', procedureId)
  .single();

  if (fetchError) {
    addInAppLog(`[EXECUTOR] Failed to fetch procedure before save: ${fetchError.message}`);
    throw fetchError;
  }

const {
  image_urls = [],
  file_urls = [],
  file_labels = [],
  captions: existingCaptions = { image: {}, file: {} },
} = procData;

const mergedCaptions = {
  image: {
    ...existingCaptions.image,
    ...captions.image,
  },
  file: {
    ...existingCaptions.file,
    ...captions.file,
  },
};

const { error: updateError } = await supabase
  .from('procedures')
  .update({
    description,
    image_urls,  // Use Supabase URLs
    file_urls,
    file_labels,
    captions: mergedCaptions, // ✅ merge local + remote to prevent data loss
  })
  .eq('id', procedureId);

  if (updateError) {
    addInAppLog(`[EXECUTOR] Failed to update procedure: ${updateError.message}`);
    throw updateError;
  }

  addInAppLog(`[EXECUTOR] Procedure metadata saved successfully: ${procedureId}`);
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

setImageCaptionDeferred: async ({ procedureId, localUri, caption, fileName }) => {
  addInAppLog(`[EXECUTOR] Attempting deferred caption sync for: ${localUri}`);

  const { data, error } = await supabase
    .from('procedures')
    .select('image_urls, captions')
    .eq('id', procedureId)
    .single();

  if (error) {
    addInAppLog(`[DEFERRED] ❌ Failed to fetch procedure: ${error.message}`);
    throw new Error(`[DEFERRED] Failed to fetch procedure: ${error.message}`);
  }

  const { image_urls = [], captions = { image: {}, file: {} } } = data;

  // 🧠 Parse fallback filename if not passed
  const fallbackName = localUri.split('/').pop();
  const nameToUse = fileName || fallbackName;

  addInAppLog(`[DEFERRED] fileName parsed: ${nameToUse}`);
  addInAppLog(`[DEFERRED] Searching image_urls: ${JSON.stringify(image_urls)}`);

  const matchedUrl = image_urls.find((url) => url.includes(nameToUse));

  if (!matchedUrl) {
    addInAppLog(`[DEFERRED] ❌ No Supabase URL found for fileName: ${nameToUse}`);
    throw new Error('[DEFERRED] Supabase URL not available yet');
  }

  const updatedCaptions = {
    ...captions,
    image: {
      ...(captions.image || {}),
      [matchedUrl]: caption,
    },
    file: captions.file || {},
  };

  const { error: updateError } = await supabase
    .from('procedures')
    .update({ captions: updatedCaptions })
    .eq('id', procedureId);

  if (updateError) {
    addInAppLog(`[DEFERRED] ❌ Failed to update caption: ${updateError.message}`);
    throw new Error(`[DEFERRED] Failed to update caption: ${updateError.message}`);
  }

  addInAppLog(`[DEFERRED] ✅ Caption synced for: ${matchedUrl}`);
}

};
