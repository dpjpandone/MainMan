Memories.txt:

Is now using a global toggle `DEV_FORCE_ALL_JOB_FAILURES` in SyncContext.js to simulate failures for all queued jobs. They want to test real jobs failing without affecting login or other Supabase functionality.

Confirmed their job queue system works correctly as of the latest commit, including triggering CombinedSyncBanner and successfully queuing jobs when offline.

DEV_FORCE_ALL_JOB_FAILURES toggle is currently set to false, and they are troubleshooting why the sync queue is failing even with force failure turned off.

Wants to redesign FailedSyncOverlay: reduce height, render text and buttons in the same row, left-align text ('X UPLOAD(S) FAILED'), right-align buttons ('Retry' in green, 'Cancel' in red), and conditionally pluralize 'UPLOADS' based on count.

FailedSyncOverlay.js includes logic to retry or delete failed jobs. The 'Delete' action clears failed jobs, acknowledges sync failure, and removes jobs from queue using removeJob(). There is a bug where after deleting a failed job, re-running the same job is blocked unless the queue is manually cleared.

Wants the 'Add New Shop' feature in ShopModal to mutate the shop list in Supabase. They are also considering adding support for renaming or deleting shop names.

Wants the new `FilterModal.js` component to mirror `ShopModal.js` in layout but apply logic for filtering machines by shop name instead of assigning them. Editing or deleting shop names will be handled here.

Is implementing a FilterModal component that behaves like ShopModal but is used to filter machine listings by shop name instead of assigning them.

HomeScreen.js lists all machines and allows adding/deleting them. They want to integrate FilterModal to filter machines by shop using the domain icon in the top right.

Wants to wire filter logic into HomeScreen using the new FilterModal.

FilterModal.js should mirror ShopModal.js in layout and behavior. It should display shops from the Supabase `shops` table (filtered by companyId), allow deleting shops in edit mode, and include an 'All' option.

Current SyncContext.js includes: global setters for syncing state, stale data tracking, and failed jobs; logic to show the hourglass (`PendingHourglass`) if `syncFailed && !syncAcknowledged`; `wrapWithSync` and `runSyncQueue` functions update sync status and stale data state. The hourglass appears conditionally based on `syncFailed` and `syncAcknowledged`.

Current wrapWithSync implementation sets global stale data to true on any error and clears it on success. They are debugging an issue where the hourglass (StaleDataOverlay) is always shown after login, even with good connection.

Has confirmed the hourglass overlay appears during offline fetch failures and disappears after a successful fetch triggered by navigation. They now want the hourglass to disappear automatically upon network reconnection, which may require triggering new fetches on reconnect in each screen.

Is updating StaleDataOverlay to act as a live 'fetch in progress' indicator using a new global `isFetching` state, set at the start and end of `wrapWithSync`.

Previously had offline caption sync working in an older version of jobExecutors.js where `saveProcedureDescription` re-fetched image/file URLs and merged local and remote captions before updating Supabase.

Is reviewing older versions of ProcedureCard.js and jobExecutors.js that had working offline caption sync logic, preparing to compare them against the current versions to identify regressions.

Is debugging an issue where new image captions disappear after refresh and the pending upload icon (hourglass) remains visible on new images until navigation occurs, even though the app is online and uploads should complete immediately.

Is designing a new standalone DC brake control system for a crane using a GE IC9528 A101N1HJ1 brake. They want to fully remove it from the legacy circuit and implement new controls with a relay/contactor and properly spec'd resistor.

Has finalized and approved MainMan Ground Rules – Version 3. Circuit must now enforce these rules in all future sessions.

Is comparing their current working branch to a previous stable branch ('stale-hourglass') to locate a regression where offline image caption jobs are no longer being queued. They are reviewing diffs for all related files to identify the omission.

Prefers using InAppLogger instead of console.log when testing offline functionality.

Wants to begin a full file-by-file audit of the codebase soon, focusing on cleanup, removing redundant patches, trimming debug logs, consolidating sync logic, and porting all hardcoded UI appearances into `globalStyles.js`. They plan to implement one exciting new feature first before starting the audit.

Wants to prioritize replacing the sync failure modal with a more confidence-inspiring UI. This includes unifying the sync/queue banner and sync/queue modal into a visually identical component, allowing the banner to be shown above modals. They are also considering a persistent sync warning indicator (possibly reusing the pending upload animation) to signal incomplete sync status.

Is ready to begin a full audit of the codebase to remove unnecessary patches, clean up bloated files, and port hardcoded visual styles to globalStyles.js. They saved the Sync UI Questionnaire for later and are starting the audit now.

Wants to conduct a file-by-file code audit starting with ProcedureCard.js. They want changes implemented in order of greatest impact and to stop and test after each significant change.

Is preparing Stable 17 of the MainMan app. They are conducting a full audit of each file to remove unnecessary patches, redundancies, and inline styles or animations. No changes should affect the current behavior or appearance of the app.

Has completed their audit of `jobExecutors.js` and confirmed that all necessary `notifyJobComplete()` calls are now in place. They are now auditing `imageUtils.js` for correctness and unnecessary legacy patches.

Tested an updated memory patching approach for file uploads in fileUtils.js but confirmed it does not resolve the stale pending icon issue for files. They have canceled this change for now and will revisit the problem later.

Is now creating `captionUtils.js` to handle image caption editing in a fullscreen modal styled identically to their existing details edit text input modal.

Is now wiring up `ImageCaptionPrompt` from `captionUtils.js` in `ProcedureCard.js`, using `imageCaptions[]` state to manage captions per image, with updates saved to the `image_captions` column in the Supabase `procedures` table.

Has implemented full support for image caption editing in ProcedureCard.js. The modal state is wired via `captionModalVisible` and `captionTargetUri`, and caption data is managed in `imageCaptions[]`, saved to Supabase in the `image_captions` column.

Has replaced the image_captions array with a single captions object structured as { image: {}, file: {} } in ProcedureCard.js. They now store image and file captions using a shared captions column in the Supabase `procedures` table.

AttachmentGridViewer lives in fileUtils.js and displays thumbnails for images and files. The clock badge overlay is conditionally rendered when the URI starts with 'file://'.

Updated `uploadImageToSupabase` to improve memory patching logic after image upload. The new version matches `fileName` suffixes and uses `.includes()` to replace local URIs with the correct Supabase public URL, fixing the issue where the clock icon would persist after sync.

Wants to use the MaterialCommunityIcons `transmission-tower` icon in place of the 🕒 clock icon to indicate pending uploads. It should be styled to fit their retro terminal cyberpunk theme and positioned in the top-right corner of the attachment thumbnail.

Wants to preview different icons over thumbnails to evaluate visual style before choosing a final icon for pending uploads.

Wants pending icons (like the tower or hourglass) to overlay thumbnails as full-image watermarks with opacity rather than green icons in the corner.

Wants to move the hourglass animation logic for pending upload icons into globalStyles.js for reuse and to clean up fileUtils.js.

Wants the animated hourglass overlay for pending uploads moved entirely into globalStyles.js as a reusable component, so fileUtils stays clean and it can be reused without additional imports.

Has confirmed that file uploads now work end-to-end with optimistic display, retry, cleanup, and Supabase sync. They are now entering an audit phase to clean up any temporary patches added before identifying the root cause (missing `addInAppLog` import). They are starting this audit with `fileUtils.js`.

Wants to audit imageUtils.js next, and during the audit, implement async file cleanup (purging local files after successful upload) similar to fileUtils.js.

Current imageUtils.js includes optimistic thumbnail display and offline support for images. It needs to be updated to remove hardcoded retry options and add async file cleanup after successful image upload, matching the behavior in fileUtils.js.

Has implemented and tested async file cleanup logic in imageUtils.js.

Wants to add offline queue support to all mutations in MasterCalendarScreen.js.

Is still experiencing duplicate insertion issues in MasterCalendarScreen despite recent fixes and wants to finalize deduplication and optimistic UI logic.

MasterCalendarScreen.js has been updated to use the corrected `tryNowOrQueue` logic for deduplication, and optimistic UI is applied only when jobs are not skipped due to being pre-queued. User's latest version is free of inline retry config and subscribes to job completion for updates.

Has rolled back SyncManager.js to a previous stable version that uses preemptive queue insertion with job ID tracking and retries. This version avoids the immediate execution race condition and fixes issues with job deduplication across screens.

Wants to rework MasterCalendarScreen.js to use tryNowOrQueue for all Supabase mutations.

Has completed auditing ProcedureCard.js and confirmed that it uses tryNowOrQueue and wrapWithSync correctly, with no leftover manual sync logic. They prefer to keep immediate refresh after actions for UI responsiveness and will consider optimistic UI enhancements later.

Wants to implement a `deleteProcedure` job executor for use with `tryNowOrQueue`.

Wants any edits made in the ProcedureCard details modal to be queued using offline queue logic when the Save button is pressed.

Wants to add offline queueing support for procedure file uploads in the `uploadProcedureFile` function inside `utils/fileUtils.js`.

Wants to add offline queue support for procedure file uploads using `tryNowOrQueue('uploadProcedureFile', {...})`, similar to image uploads.

Is working on the branch `SyncWithRetry` for the MainMan React Native app. The sync system is complete and uses a queue + retry architecture with `wrapWithSync` from `utils/SyncManager.js`. Sync UI includes `SyncBanner`, `QueueBanner`, `SyncFailureModal`, and `FailedSyncBanner`. User is now refining layout and appearance of `QueueBanner` and `FailedSyncBanner` to avoid UI interference, respect SafeArea/StatusBar, and improve styling.

Wants only the files sent in the current conversation to be treated as the source of truth for sync-related UI logic. Older context from previous versions of the code should not influence this session.

Is replacing Expo's built-in image crop UI with a custom ImageEditorModal component that provides rotate, crop, and compress options using expo-image-manipulator.

Wants to revert to the last commit and start fresh with image handling logic. All image-related logic, including the new image editing and upload flow, will now be managed entirely in imageUtils.js.

Is working on adding image captioning to their app. They want to allow captions to be added from the fullscreen image viewer or image editor, and have the thumbnails display truncated captions as labels, similar to how PDF files are labeled.

Wants the image upload flow to include a post-picker modal offering 'Crop' and 'Save' options. 'Crop' should launch the ImagePicker UI with allowsEditing: true, while 'Save' should upload the unmodified image. This modal should be integrated into imageUtils.js, not a separate file.

Has deprioritized custom image editing due to better native editing tools on Android and iOS. They now want to focus on adding captions to images within the fullscreen image viewer.

Is now using "MainMan Ground Rules v2 – Supabase Client Edition" as the active ground rules. These update the original set as follows:

1. Supabase interaction uses the official Supabase client. Snake_case is used directly when interacting with Supabase. No case conversion logic is needed. Fetches are not forced; standard Supabase behavior is used.

4. When modularizing code, all relevant logic must be transferred in full. This includes Supabase-specific patterns and conventions. No leftover or legacy logic should be assumed or retained.

All other original ground rules remain unchanged.

Has fully restored ProcedureCard.js and wants to continue wrapping each fetch/mutate with `wrapWithSync` from top to bottom, including injecting sync awareness where appropriate. They are working from a clean base and prioritizing visual clarity and reliability of sync operations.

Wants to implement a sync warning message that can be shown within a modal, as an alternative to the sync banner which is hidden by modals.

Wants to use `SyncWarning` inside modals and `SyncBanner` on main screens.

Wants to finish wrapping `ProcedureCard.js` with `wrapWithSync` and is using `SyncWarning` inside modals and `SyncBanner` on main screens as the standard convention.

Wants to begin wrapping `imageUtils.js` with `wrapWithSync`, starting with `deleteProcedureImage` and `uploadProcedureImage`.

Has implemented sync-wrapped file upload and deletion logic in utils/fileUtils.js using `wrapWithSync` for all Supabase interactions.

Is updating ChecklistScreen.js to support sync banners and is beginning to refactor fetch logic using wrapWithSync from SyncManager.

Wants to keep the `sync-banner` branch separate for now. On May 5, 2025, they plan to insert sync banner logic before every fetch in multiple files, test the result, and if all works, push to `main`.

Is transitioning HomeScreen.js to use the official Supabase client for all fetch and mutation logic, replacing manual fetch calls.

Wants to refactor AppContext.js to be a real provider that loads loginData from AsyncStorage at launch and provides it via context.

File utils/supaBaseConfig.js contains Supabase client initialization using `createClient`, and exports both the client and config constants.

Wants to convert ProcedureCard.js to use the shared Supabase client, working top-to-bottom using exact find-and-replace snippets with full context and no ellipses.

Wants to update MachineScreen.js to use the shared Supabase client, replacing all manual fetch and mutation logic with cleaner Supabase client calls.

Is updating ProcedureCard.js to remove all manual fetch/mutate logic and use the Supabase client from supaBaseConfig.js instead.

Wants to fully refactor imageUtils.js to replace all raw fetch and upload calls with official Supabase client logic, and prefers this to be done step-by-step, snippet by snippet.

Wants to refactor fileUtils.js to use the official Supabase client for file upload and deletion logic.

Is porting `MasterCalendarScreen.js` from manual REST fetches to the official Supabase client.

Has provided the full code for ProcedureCard.js, which includes fetches and mutations for procedures, attachments, and profile data. This file is now being prepared for sync wrap refactoring using wrapWithSync().

Plans to implement an "Edit Interval" feature starting at a date selected via a calendar picker.

Wants the gear icon in the ProcedureCard modal (top-left in edit mode) to open a modal where they can update the procedure interval and select a 'last completed' date via a lightweight calendar picker.

Is creating a new component called ProcedureSettings.js to allow editing a procedure's interval and last completed date via modal with a calendar picker.

Wants `ProcedureSettings.js` to be a self-contained module that fetches and updates procedure data directly from Supabase. Once launched, it should not rely on any state or props from `ProcedureCard.js` beyond the initial trigger.

ProcedureSettings.js should still be self-contained, but it requires `procedureId` and company info (e.g., companyId) to be passed in. All other data should be fetched in real time from Supabase.

Is reusing the calendar picker library from MasterCalendarScreen in ProcedureSettings.js.

Current ProcedureCard.js version includes recent cleanup. They removed unused props (`navigation`, `initialPastDue`) and now reference the most recent state directly from Supabase upon every render. Current modal behavior includes `refreshMachine()` call on close to trigger status updates after edits.

Wants the status line on procedure cards to show more detail: if past due, it should say 'X days past due'; if up to date, it should say 'completed: (date) (user)'.

Does not want ChatGPT to use canvas unless explicitly requested. All code and responses should be provided directly in chat.

Wants to review all prior brainstorming sessions to reflect on completed and upcoming goals.

Replaced ImageGridViewer with AttachmentGridViewer from fileUtils.js and wants to remove unused imageUtils.js code such as ImageGridViewer.

Is designing a non-intrusive alert system for their app, tailored to a foreman named Jeff who oversees machine operators and maintenance personnel. Jeff prefers minimal distractions and only wants alerts about past-due procedures during a designated morning prep time on weekdays. The alert should summarize overdue items and allow quick access to override or review details without navigating through multiple screens.

Has defined a set of development 'ground rules' for collaboration on the MainMan project:

1. Supabase has limitations. All fetches should be forced where necessary. CamelCase-to-snake_case conversion logic is required for Supabase integration to function correctly.
2. Do not alter the appearance of UI elements without prior discussion.
3. Do not alter the functionality of features without prior discussion.
4. When modularizing code (e.g., moving logic to another file), all relevant logic must be transferred in full—including Supabase-specific workarounds like camelCase-to-snake_case conversion.
5. The assistant ("Circuit") is not meant to be agreeable or compliant but rather a consulted expert who provides the best, cleanest, and most robust solutions, even if that means challenging user decisions.
6. Mistakes are acceptable. If Circuit makes a mistake, it must be acknowledged. Once the root problem is identified, any unnecessary changes made during debugging must be rolled back. Circuit should clearly state which changes were unnecessary and ensure the solution is preserved.
7. Circuit will repeat these rules verbatim and then summarize them to confirm understanding. If anything is unclear, clarification will be requested.

Wants to replace Alert.prompt with a custom modal prompt in uploadProcedureFile to tag files with labels before upload.

Wants to implement a custom modal prompt in uploadProcedureFile to tag files with labels before upload.

Wants a reusable FileLabelPrompt component implemented as a standalone modal for tagging uploaded files, rather than using an Alert-based prompt.

Wants to move the visual layout logic for the PDF icons in AttachmentGridViewer into globalStyles.js for better style reuse and maintainability.

Current globalStyles.js includes compact one-line styles. They have finalized the layout for PDF labels and icons in AttachmentGridViewer and are ready to move this styling into the global styles module.

Wants to move the PDF file icon and label layout for AttachmentGridViewer into globalStyles.js to reduce redundancy and improve maintainability.

Goals before the end of the night are: 1. Try FlatList for gallery layout but keep time spent limited. 2. Allow more file types in upload logic. 3. Make plain text URLs in the description box clickable and open in browser.

Is migrating their image and file gallery to FlatList layout for improved centering and performance.

Wants to support a secure list of file types for upload including PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, RTF, JSON, and Markdown.

ImageUtils.js includes FullscreenImageViewer with zoom/pan/rotate buttons and ImageGridViewer with editable thumbnails. They want to modularize fullscreen image logic by extracting viewer state and modal trigger into a reusable controller component.

Has completed modularizing fullscreen image handling into imageUtils.js, including moving FullscreenImageViewer and using a controller component to expose setSelectedImageIndex.

Wants to move `handleImagePick` and `handleDeleteImage` from `ProcedureCard.js` into `imageUtils.js` to reduce file size and improve modularity.

Wants to modularize ProcedureCard.js by moving image handling logic (handleImagePick, handleDeleteImage) to imageUtils.js to improve readability and maintainability.

Has modularized image upload and delete logic from ProcedureCard.js into helper functions located in imageUtils.js: `uploadProcedureImage` and `deleteProcedureImage`.

Renamed the "Add Doc" button to "Files" in the ProcedureCard edit mode UI.

Wants to modularize file handling logic into a new file called fileUtils.js, following the same structure as imageUtils.js.

Is creating a new helper module called fileUtils.js to manage document (e.g. PDF) upload, delete, and related logic. Supabase fetches must respect known case sensitivity and workarounds.

Wants to modularize file upload logic into fileUtils.js, starting with verifying document (PDF) uploads to Supabase. They plan to eventually combine image and file display into a single gallery view.

Has renamed the document upload button in the ProcedureCard modal to 'Files' and wants it wired to Supabase upload logic from fileUtils.js.

Wants the 'Files' button in ProcedureCard.js to trigger a file picker and upload logic via fileUtils.js.

Is adding document (PDF/file) upload support to their app and is verifying that files are uploaded to the correct Supabase Storage bucket.

Has implemented PDF document uploads using `expo-document-picker` and `FileSystem.uploadAsync`, storing documents in the Supabase Storage bucket named `procedure-uploads`. The logic resides in `fileUtils.js`.

Document uploads now successfully reach Supabase and return a 200 status, but a `TypeError: Cannot convert undefined value to object` occurs immediately after.

Wants to use real state for file uploads in ProcedureCard.js, with `fileUrls` and `setFileUrls`.

Wants to create a new gallery component that combines both images and files for display in ProcedureCard, replacing the current image-only viewer.

Wants to combine image and file attachments into a single gallery component called AttachmentGridViewer that preserves the appearance and behavior of the current ImageGridViewer.

Wants to replace ImageGridViewer with a unified AttachmentGridViewer that displays both images and files in a single gallery. This new component will reside in fileUtils.js and preserve current styling and behaviors while supporting edit mode, delete overlays, and appropriate file viewing.

Is implementing support for file labels on uploaded PDFs. The `ProcedureCard.js` component now tracks both `fileUrls` and `fileLabels`.

Has marked the current version of the project as milestone 11.0. This version includes a fix for procedure image uploads and ensures that fresh images are pulled on modal open, resolving previous refresh issues.

ProcedureCard.js file includes multi-image upload, description editing, fullscreen image viewer, delete image with confirmation, and structured modals. They now want to add PDF/file upload support with a new file_urls[] column already added in Supabase.

Prefers the app to have an industrial vibe with minimal animations. The only animation they require is the flashing past due card, and dynamic resizing of elements is acceptable but doesn't need to be animated. Transitions like fading or sliding are not necessary.

Wants all image handling logic to be moved to imageUtils.js.

Wants to move all image handling logic from ProcedureCard.js to imageUtils.js for better modularity and organization.

Wants to remove all logic concerning non-routine procedures from MachineScreen and handle them entirely within the CalendarScreen instead.

Wants to further optimize MachineScreen.js by offloading complexity—such as image handling—into helper functions or possibly state machines.

Wants to optimize MachineScreen.js by extracting complex logic (image handling, modal state, etc.) into helper functions or modular components for cleaner, more maintainable code.

Wants to begin optimizing MachineScreen.js by extracting image handling logic into a separate module or helper file.

App will support multiple users collaborating to mark procedures complete and upload images, enabling team-based shop maintenance tracking.

Is offloading the ProcedureCard component from MachineScreen.js into its own separate file for better modularity.

Has successfully offloaded the ProcedureCard component into its own file: components/ProcedureCard.js.

Has successfully moved the ProcedureCard component into its own file: components/ProcedureCard.js. Fullscreen modal and image handling logic still resides within MachineScreen.js and has not yet been migrated.

Has successfully offloaded the ProcedureCard component into its own file: components/ProcedureCard.js. Fullscreen modal and image handling logic have been moved there as well.

Styles for their app are currently located inside MachineScreen.js. They are considering moving these styles to their own separate file for better organization.

Wants to offload the fullscreen image viewer modal from ProcedureCard.js into a separate component.

Has a file called `imageUtils.js` located in the `/utils` directory and wants to store the fullscreen image viewer modal there.

Has successfully offloaded the fullscreen image viewer from ProcedureCard.js into utils/imageUtils.js, using a component called FullscreenImageViewer.

Wants to continue optimizing ProcedureCard.js by offloading image grid rendering into a separate component.

Has offloaded both the fullscreen image viewer and the image grid from ProcedureCard.js into utils/imageUtils.js.

Wants to remove styles from ChecklistScreen and move them to global styles in globalStyles.js.

Supabase configuration constants are stored in a file called `supaBaseConfig.js`.

Wants non-routine procedures to appear only on the Calendar screen and not on ProcedureCard components in MachineScreen.

Prefers using a single database with a separate companyId field to manage data for multiple companies in their app.

Wants to be told what is being changed, shown the code snippet with line reference, and then receive the full code. Their goal is to improve their own skills by learning to locate changes before relying on full redraws.

Refers to the assistant as 'Circuit'.