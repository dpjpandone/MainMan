## ✅ CORE MEMORIES COMMITTED (24)

### App Initialization & Context
1. **App.js Root Structure** – Provides global context, tab navigation, status overlays, and initializes Sync + AppProvider.
2. **AppContext.js Auth State** – Central store for login session; loads/stores from AsyncStorage; used across all screens.
3. **SyncContext.js State & Triggers** – Manages sync state, stale data, queue status, and network/app reconnect triggers.

### UI + Logic Surface
4. **ProcedureCard.js Core UI Logic** – Handles optimistic attachments, captions, modal editing, and job subscriptions per procedure.
5. **ProcedureSettings.js Interval UI** – Displays and updates interval days and last completed date using SyncManager.
6. **AttachmentGridViewer (fileUtils.js)** – Renders procedure attachments with caption overlays, deletion gestures, and hourglass indicators.
7. **FullscreenImageViewer (imageUtils.js)** – Provides pinch+pan fullscreen image preview and sets window._setSelectedImageIndex.

### Core Screens
8. **HomeScreen.js Machine List** – Fetches machines per company, filters by shop, and allows creation via modal with optional shop auto-assign.
9. **MachineScreen.js Procedure List** – Loads machine + procedures, reacts to job completions, and adds procedures with metadata.
10. **LoginScreen.js Auth + Role Context** – Handles login, stores user info in context, and securely persists credentials via SecureStore.

### Sync Logic & Job Flow
11. **SyncManager.js wrapWithSync** – Central sync wrapper that marks data as stale on failure and clears flags on success.
12. **SyncManager.js tryNowOrQueue** – Attempts immediate execution, retries N times, then queues job for later processing.
13. **SyncManager.js Job Completion Subscriptions** – Allows views to subscribe to job completions and rerun local fetches.
14. **SyncManager.js Critical Mutations Set** – Central `MUTATION_LABELS` registry used for job behavior control and failure injection.
15. **SyncContext.js Queue + Banner State** – Provides live queued job count, stale state overlays, and animated retry countdown.
16. **SyncContext.js Network + AppState Triggers** – Triggers `runSyncQueue()` on app resume or connectivity restoration.
17. **SyncContext.js Hourglass Defer Logic** – Keeps stale indicator visible briefly after fetch completes; hides only if acknowledged.
18. **SyncContext.js Failed Job Modal** – Displays upload failures with “Retry” and “Dismiss” actions to requeue or clear stale state.
19. **JobQueue.js AsyncStorage Format** – Queues jobs locally with UUID, retry counter, and last attempt timestamp.
20. **JobQueue.js Retry Increment Logic** – Increments attemptCount, defers retries exponentially for smarter queue processing.
21. **jobExecutors.js Modular Logic** – All job executors live here; includes addProcedure, markComplete, saveDescription, etc.
22. **jobExecutors.js Caption Patch Logic** – Handles `setImageCaptionDeferred` with fallback filename parsing and final Supabase caption update.

### Optimistic UI & Upload Flow
23. **uploadImageToSupabase() Patch Flow** – After successful image upload, replaces local URI in memory and Supabase with final URL.
24. **uploadFileToSupabase() Patch Flow** – Mirrors image patch flow; ensures local file URI is replaced by Supabase URL after upload.

