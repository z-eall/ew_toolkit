Type: grilling
Status: resolved

## Question

The Clear-All dropdown gets a second option, "Clear Invalid files" (item 1 of the /wayfinder request). Which files does it remove — files with validation errors, or something else?

## Answer

Removes files carrying the existing `INVALID_FILE_CATEGORY` ("Invalid file") diagnosis branch (`fileNameCheck.ts:13`) — i.e. files whose name doesn't match an EWP structural filename and so aren't EWP-related at all. It is not scoped to validation errors/warnings; a file with real EWP validation errors but a valid filename is untouched by "Clear Invalid files".

Implementation note: filter `fileManager.allFiles` for files whose `problems` include a row with `branch === INVALID_FILE_CATEGORY`, confirm, then remove each (mirrors the existing per-folder remove confirm in `main.ts:374-379`).
