import { uploadImageToSupabase } from './imageUtils';
import { SUPABASE_URL, SUPABASE_BUCKET, SUPABASE_KEY, supabase } from './supaBaseConfig';
import { addInAppLog } from '../utils/InAppLogger';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

export const jobExecutors = {
  uploadProcedureImage: async (payload) => {
    console.log('[EXECUTOR] Uploading image via Supabase:', payload.localUri);
    await uploadImageToSupabase(payload);
    console.log('[EXECUTOR] Upload complete');
  },

  updateProcedureSettings: async ({ procedureId, intervalDays, selectedDate, userId }) => {
    console.log('[EXECUTOR] Received payload:', { procedureId, intervalDays, selectedDate, userId });

    const body = {
      interval_days: parseInt(intervalDays),
      last_completed: selectedDate ? new Date(selectedDate).toISOString() : null,
      completed_by: selectedDate ? userId : null,
    };

    const { error } = await supabase
      .from('procedures')
      .update(body)
      .eq('id', procedureId);

    if (error) throw error;

    console.log('[QUEUE EXEC] Updated procedure settings:', procedureId);
  },

  uploadProcedureFile: async ({ procedureId, fileUrls, setFileUrls, scrollToEnd, fileLabels, setFileLabels, label }) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const file = result.assets[0];
        const uri = file.uri;

        const sanitizedLabel = label?.trim().replace(/[^a-z0-9_\-]/gi, '_') || 'Untitled';
        const fileName = `${sanitizedLabel}-${procedureId}-${Date.now()}.pdf`;
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${fileName}`;

        const uploadResponse = await FileSystem.uploadAsync(uploadUrl, uri, {
          httpMethod: 'PUT',
          headers: {
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/pdf',
            'x-upsert': 'true',
          },
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        });

        if (uploadResponse.status !== 200) {
          throw new Error(`Upload failed with status ${uploadResponse.status}`);
        }

        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${fileName}`;
        const updatedUrls = [...(fileUrls || []), publicUrl];
        const updatedLabels = [...(fileLabels || []), sanitizedLabel];

        setFileUrls(updatedUrls);
        setFileLabels(updatedLabels);

        const { error: patchError } = await supabase
          .from('procedures')
          .update({
            file_urls: updatedUrls,
            file_labels: updatedLabels,
          })
          .eq('id', procedureId);

        if (patchError) throw patchError;

        setTimeout(() => {
          if (scrollToEnd) scrollToEnd();
        }, 300);
      }
    } catch (err) {
      addInAppLog(`[EXECUTOR] Error uploading procedure file: ${err.message || err}`);
      throw err;
    }
  },

  markProcedureComplete: async ({ procedureId, intervalDays, userId }) => {
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

    if (error) throw error;

    console.log('[QUEUE EXEC] Marked procedure complete:', procedureId);
  },

  saveProcedureDescription: async ({ procedureId, description, imageUrls, fileUrls, fileLabels }) => {
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
     