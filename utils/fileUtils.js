// utils/fileUtils.js

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { SUPABASE_URL, SUPABASE_BUCKET, SUPABASE_KEY } from './supaBaseConfig';

// Upload Document Helper
export async function uploadProcedureFile({ procedureId, fileUrls, setFileUrls, scrollToEnd }) {
    try {
      console.log('Opening document picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });
  
      console.log('Picker result:', result);
  
      // Validate based on result.cancelled instead of type
      if (!result.canceled && result.assets?.length > 0) {
        const file = result.assets[0];
        const uri = file.uri;
        const fileName = `${procedureId}-${Date.now()}.pdf`;
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${fileName}`;
  
        console.log('Selected file:', uri);
        console.log('Uploading to:', uploadUrl);
  
        const uploadResponse = await FileSystem.uploadAsync(uploadUrl, uri, {
          httpMethod: 'PUT',
          headers: {
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/pdf',
            'x-upsert': 'true',
          },
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        });
  
        console.log('Upload response:', uploadResponse);
  
        if (uploadResponse.status === 200) {
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${fileName}`;
          const updated = [...(fileUrls || []), publicUrl];
          setFileUrls(updated);
  
          console.log('Upload successful, updating procedure record:', publicUrl);
  
          await fetch(`${SUPABASE_URL}/rest/v1/procedures?id=eq.${procedureId}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ file_urls: updated }),
          });
  
          setTimeout(() => {
            if (scrollToEnd) scrollToEnd();
          }, 300);
        } else {
          alert(`Upload failed: ${uploadResponse.status}`);
        }
      } else {
        console.log('No file selected or picker cancelled.');
      }
    } catch (err) {
      console.error('File upload error:', err);
      alert('Upload failed: ' + err.message);
    }
  }
  
// Delete Document Helper
export async function deleteProcedureFile({ uriToDelete, fileUrls, procedureId, setFileUrls, refreshMachine }) {
  try {
    const fileName = uriToDelete.split('/').pop();
    const deleteUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${fileName}`;
    console.log('Deleting file:', deleteUrl);

    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });

    console.log('Delete response:', deleteResponse.status);

    const updatedFiles = fileUrls.filter(uri => uri !== uriToDelete);
    setFileUrls(updatedFiles);

    const patchResponse = await fetch(`${SUPABASE_URL}/rest/v1/procedures?id=eq.${procedureId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ file_urls: updatedFiles }),
    });

    console.log('Updated file_urls in Supabase');

    if (refreshMachine) refreshMachine();
  } catch (error) {
    console.error('Failed to delete file:', error);
  }
}
