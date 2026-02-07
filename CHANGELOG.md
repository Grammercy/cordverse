# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **@ Mention Autocomplete & Display:**
  - Implemented `@` mention autocomplete in the chat input, suggesting users by username or display name.
  - Limited autocomplete suggestions to 3 users.
  - Mentions are formatted as `<@USER_ID>` in the input and correctly parsed and displayed as `@DisplayName` in messages.
- **File Uploads:**
  - Added functionality to attach and send files (e.g., images, documents) in chat messages.
  - Implemented a file preview area in the chat input with options to remove selected files.
  - Backend integration with `multer` to handle `multipart/form-data` for file uploads.
- **Message Editing:**
  - Added the ability to edit own messages inline within the chat area.
  - UI includes an edit button on message hover, an input field for editing, and options to save (Enter) or cancel (Escape).
  - Real-time updates for edited messages across all connected clients.
- **Message Deletion:**
  - Added the ability to delete own messages from the chat.
  - UI includes a delete button on message hover.
  - Real-time updates for deleted messages across all connected clients.
- **User Status Updates:**
  - Implemented a status selector in the sidebar, allowing users to set their presence (Online, Idle, Do Not Disturb, Invisible).
- **Message Pagination (Infinite Scroll):**
  - Enabled loading of older messages when scrolling to the top of the chat area.
  - Implemented backend pagination support and frontend integration with a loading indicator.
- **Online Member Display & Count:**
  - Displayed online member counts for guilds in the sidebar.
  - Added a categorized list of online and offline members in the channel list for the selected guild.
- **Typing Indicators:**
  - Show "X is typing..." messages at the bottom of the chat area when other users are actively typing.
  - Implemented debounced event emission and automatic timeout for typing status.
- **Channel Search:**
  - Added a search input to the channel list, allowing users to filter channels by name.
- **Channel Categories & Collapsible Sections:**
  - Organized channels under their respective categories, with collapsible/expandable sections for better navigation.
  - Voice channels are also integrated into this categorized view.
- **Voice Channel Display:**
  - Voice channels are now displayed in the channel list with a distinct icon.
- **QR Login Status Updates:**
  - Enhanced the QR code login process with real-time status feedback (generating, waiting for scan, scanned, authenticating, error/timeout).
- **Dark Mode Toggle:**
  - Added a UI toggle in the sidebar to switch between dark and light themes, with preference saved locally.
- **Multi-Account Switching:**
  - Implemented a menu in the sidebar to switch between saved Discord accounts without re-logging in.
  - Allows logging out to add new accounts.
- **Master Lock Implementation:**
  - Confirmed the existing master password protection for initial application access.
- **Default Guild Icons:**
  - Implemented dynamic, color-coded default icons for guilds without custom avatars, using guild initials.

### Changed
- Refactored socket connection management and error handling to provide better feedback on Discord client errors and token invalidation, leading to automated logout for invalid tokens.
- Optimized backend guild member fetching to reduce `MaxListenersExceededWarning` by removing redundant `await guild.members.fetch()`.
- Refined channel switching logic to clear messages and reset pagination state for a cleaner UX.

### Fixed
- Addressed `MaxListenersExceededWarning` in the backend by increasing the max listener limit and optimizing member fetching.
- Resolved frontend TypeScript compilation errors related to `NodeJS.Timeout` type and duplicate state declarations.
- Fixed frontend JSX syntax error in `Login.tsx`.
